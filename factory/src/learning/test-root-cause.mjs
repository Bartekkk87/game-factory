import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeFailedProductionRun, proposalFromRootCause } from './root-cause.mjs';

const source = fs.readFileSync(new URL('./root-cause.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(source, /verify\/state-semantics/, 'root-cause falsifier must not inherit the verifier state vocabulary it is supposed to challenge');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-root-cause-'));
const runId = 'failed-fixture-1';
const runDir = path.join(root, runId);
fs.mkdirSync(runDir, { recursive: true });

fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({
  run: { id: runId, status: 'failed', reason: 'debug_exhausted' },
  gates: { technical: { pass: false }, productFidelity: { pass: false } }
}, null, 2));
fs.writeFileSync(path.join(runDir, 'FAILURE.json'), JSON.stringify({ reason: 'debug_exhausted' }, null, 2));
fs.writeFileSync(path.join(runDir, 'gdd.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC-FAIL', probe: { id: 'PR-FAIL', kind: 'state_reached', state: 'failed' } },
    { id: 'AC-WIN', probe: { id: 'PR-WIN', kind: 'state_reached', state: 'success' } }
  ],
  proofPlan: {
    pass: true,
    scenarios: [
      { id: 'base', inputMode: 'active+idle-control', seconds: 12, stopStates: [], restartAtEnd: false },
      { id: 'success-proof', inputMode: 'active', seconds: 75, stopStates: ['success'], restartAtEnd: true }
    ]
  }
}, null, 2));

function writeAttempt(number, failedChecks, { runtimeErrors = [], observedStates = ['title', 'playing'], fidelity = [] } = {}) {
  const dir = path.join(runDir, `attempt-${String(number).padStart(2, '0')}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'evidence-tech.json'), JSON.stringify({
    contract: {
      pass: failedChecks === 0,
      checks: Array.from({ length: failedChecks }, (_, i) => ({ id: `TECH-${i + 1}`, pass: false })),
      runtimeErrors
    },
    telemetry: observedStates.map((state, i) => ({ phase: `p${i}`, snapshot: { state, errors: runtimeErrors } }))
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'evidence-fidelity.json'), JSON.stringify({ pass: fidelity.length === 0, criteria: fidelity }, null, 2));
  fs.writeFileSync(path.join(dir, 'telemetry.json'), JSON.stringify({
    proofScenarios: observedStates.map((state, i) => ({ id: `s${i}`, endState: state }))
  }, null, 2));
}

const failedCriterion = {
  requirementId: 'MH-04', probeId: 'PR-FAIL', kind: 'state_reached', pass: false,
  detail: 'state failed not reached in verifier scenarios'
};
writeAttempt(1, 9, { observedStates: ['title', 'playing'], fidelity: [failedCriterion] });
writeAttempt(2, 2, { observedStates: ['title', 'playing', 'gameover'], fidelity: [failedCriterion] });
writeAttempt(3, 5, { runtimeErrors: ['ellipse requires 7 arguments'], observedStates: ['title', 'playing'], fidelity: [failedCriterion] });

try {
  const report = analyzeFailedProductionRun({ runId, runsRoot: root });
  assert.equal(report.schemaVersion, 'failed-run-root-cause-v1');
  assert.deepEqual(report.trajectory, [10, 3, 6]);
  assert.equal(report.bestAttempt, 'attempt-02');
  assert.equal(report.finalAttempt, 'attempt-03');
  assert.equal(report.authority.mustNot.includes('activate-candidate'), true);
  assert.match(report.diagnosticIndependence, /do not import verifier state semantics/);
  const ids = report.findings.map((item) => item.id);
  assert(ids.includes('repair-regression-after-best-attempt'));
  assert(ids.includes('new-runtime-error-after-repair'));
  assert(ids.includes('terminal-proof-scenario-gap'));
  assert(ids.includes('terminal-state-vocabulary-mismatch'));
  assert.equal(report.findings.find((x) => x.id === 'terminal-proof-scenario-gap').confidence, 1);
  const proposal = proposalFromRootCause(report, 'candidate-fixture');
  assert.equal(proposal.scope, 'case-root-cause');
  assert.equal(proposal.active, undefined);
  assert.deepEqual(proposal.sourceRunIds, [runId]);
  assert.match(proposal.text, /Hypothesis only/);
  assert.match(proposal.text, /Do not activate/);

  fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({ run: { id: runId, status: 'success' } }, null, 2));
  assert.throws(() => analyzeFailedProductionRun({ runId, runsRoot: root }), /only accepts failed production runs/);
  console.log('autonomous failed-run root cause selftest: PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
