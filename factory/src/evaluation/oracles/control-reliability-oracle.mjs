import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semanticFailureSignature } from '../../control/failure-signature.mjs';
import { evaluateRepairProgress, retainBestFailed } from '../../control/repair-policy.mjs';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

function sameSemanticFailure(fps, diff, timeline) {
  return {
    failures: [
      { id: 'fps_ok', gate: 'technical', detail: `fps=${fps}` },
      { id: 'visual_activity', gate: 'technical', detail: `${diff}% pixels changed; ${timeline}` }
    ],
    consoleErrors: [], pageErrors: [], probeErrors: []
  };
}

function bundle(attempt, failures, pageErrors = []) {
  return {
    attempt,
    failures: Array.from({ length: failures }, (_, index) => ({ id: `f-${attempt}-${index}` })),
    consoleErrors: [], pageErrors, probeErrors: []
  };
}

function candidate(attempt, failures, pageErrors = []) {
  return { design: { id: `design-${attempt}` }, tech: { id: `tech-${attempt}` }, bundle: bundle(attempt, failures, pageErrors) };
}

const runSource = fs.readFileSync(new URL('../../pipeline/run.mjs', import.meta.url), 'utf8');
const caseId = caseIdFromArgs();
if (caseId === 'fr-repair-signature-jitter-normalization') {
  const a = semanticFailureSignature(sameSemanticFailure(28, 0.31, 'end=playing/4'));
  const b = semanticFailureSignature(sameSemanticFailure(29, 0.29, 'end=playing/5'));
  const c = semanticFailureSignature(sameSemanticFailure(27, 0.34, 'end=playing/4'));
  assert.equal(a, b);
  assert.equal(b, c);
} else if (caseId === 'fr-repair-signature-different-check-distinct') {
  const base = semanticFailureSignature(sameSemanticFailure(28, 0.31, 'end=playing/4'));
  const different = semanticFailureSignature({ failures: [{ id: 'probe_present', gate: 'technical', detail: 'probe missing' }], consoleErrors: [], pageErrors: [], probeErrors: [] });
  assert.notEqual(base, different);
} else if (caseId === 'fr-runtime-error-jitter-normalized') {
  const a = semanticFailureSignature({ failures: [{ id: 'no_runtime_errors', gate: 'technical' }], consoleErrors: [], pageErrors: ['TypeError: ellipse expected 7 arguments, got 6 at /tmp/run-123/game.js:47:18'], probeErrors: [] });
  const b = semanticFailureSignature({ failures: [{ id: 'no_runtime_errors', gate: 'technical' }], consoleErrors: [], pageErrors: ['TypeError: ellipse expected 8 arguments, got 5 at /tmp/run-999/game.js:52:21'], probeErrors: [] });
  assert.equal(a, b);
} else if (caseId === 'fr-runtime-error-signature-distinct') {
  const a = semanticFailureSignature({ failures: [{ id: 'no_runtime_errors', gate: 'technical' }], consoleErrors: [], pageErrors: ['TypeError: ellipse expected 7 arguments, got 6 at /tmp/run-123/game.js:47:18'], probeErrors: [] });
  const b = semanticFailureSignature({ failures: [{ id: 'no_runtime_errors', gate: 'technical' }], consoleErrors: [], pageErrors: ['ReferenceError: missingFunction is not defined at /tmp/run-123/game.js:47:18'], probeErrors: [] });
  assert.notEqual(a, b);
} else if (caseId === 'fr-verifier-failure-durable-fail-closed') {
  const directVerifyAwaits = [...runSource.matchAll(/await verifyAttempt\(/g)];
  assert.equal(directVerifyAwaits.length, 1);
  assert.match(runSource, /async function verifyAttemptFailClosed\([\s\S]*?try \{[\s\S]*?await verifyAttempt\([\s\S]*?catch \(e\) \{[\s\S]*?failClosed\(runDir, state, 'verifier_failed'/);
  assert.ok([...runSource.matchAll(/await verifyAttemptFailClosed\(/g)].length >= 3);
} else if (caseId === 'fr-verifier-exception-failclosed-boundary') {
  assert.match(runSource, /async function verifyAttemptFailClosed\([\s\S]*?catch \(e\) \{[\s\S]*?failClosed\(runDir, state, 'verifier_failed'/);
  assert.doesNotMatch(runSource, /\n\s*tech = await verifyAttempt\(\{ runDir, attempt, design, ownerContract, gdd \}\);/);
} else if (caseId === 'hr-harbor-repair-regression') {
  let best = null;
  for (const current of [candidate(1, 9), candidate(2, 5), candidate(3, 2)]) best = retainBestFailed({ best, current }).best;
  const regression = retainBestFailed({ best, current: candidate(4, 8) });
  assert.equal(regression.evaluation.regressed, true);
  assert.equal(regression.evaluation.reason, 'more-failed-checks');
  assert.equal(regression.best.design.id, 'design-3');
  const ellipseError = "pageerror: Failed to execute 'ellipse' on 'CanvasRenderingContext2D': 7 arguments required, but only 6 present.";
  const runtimeRegression = retainBestFailed({ best, current: candidate(5, 1, [ellipseError]) });
  assert.equal(runtimeRegression.evaluation.regressed, true);
  assert.equal(runtimeRegression.evaluation.reason, 'new-runtime-error');
  assert.equal(runtimeRegression.best.design.id, 'design-3');
  const noChange = evaluateRepairProgress({ currentBundle: bundle(7, 1), bestBundle: bundle(6, 1) });
  assert.equal(noChange.reason, 'no-material-improvement');
} else {
  throw new Error(`unsupported control-reliability corpus case: ${caseId}`);
}

console.log(JSON.stringify({ caseId, observation: 'PASS' }));
