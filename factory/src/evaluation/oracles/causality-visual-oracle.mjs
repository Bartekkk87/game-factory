import assert from 'node:assert/strict';
import path from 'node:path';
import { ROOT } from '../../config.mjs';
import { runSession } from '../../verify/harness.mjs';
import { evaluateContract } from '../../verify/contract.mjs';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

const greenDir = path.join(ROOT, 'examples', 'fixtures', 'green');
const fastSuccessDir = path.join(ROOT, 'examples', 'fixtures', 'fast-success-activity');
const staticLiveDir = path.join(ROOT, 'examples', 'fixtures', 'static-live');

async function greenObservation() {
  const report = await runSession({ root: greenDir, seconds: 5 });
  const verdict = await evaluateContract(report, { minFps: 10, bgColor: '#101426' });
  return { report, verdict };
}

const caseId = caseIdFromArgs();
if (caseId === 'gp-input-causality-active-delta-pass') {
  const { report, verdict } = await greenObservation();
  assert.equal(report.idleBaseline?.inputMode, 'idle');
  assert.equal(report.idleBaseline?.seed, report.seed);
  assert.equal(verdict.checks.find((check) => check.id === 'input_causality')?.pass, true);
  assert.equal(verdict.passed, true, JSON.stringify(verdict.failures));
} else if (caseId === 'gp-input-causality-autonomous-reject') {
  const { report } = await greenObservation();
  const autonomousLike = structuredClone(report);
  autonomousLike.idleBaseline = {
    ...structuredClone(report.idleBaseline),
    earlySnapshot: structuredClone(report.earlySnapshot),
    midSnapshot: structuredClone(report.midSnapshot),
    endSnapshot: structuredClone(report.endSnapshot),
    timeline: structuredClone(report.timeline)
  };
  const verdict = await evaluateContract(autonomousLike, { minFps: 10, bgColor: '#101426' });
  assert.equal(verdict.passed, false);
  assert.equal(verdict.failures.some((failure) => failure.id === 'input_causality'), true);
} else if (caseId === 'gp-visual-duplicate-activity-evidence-reject') {
  const { report } = await greenObservation();
  const manipulated = structuredClone(report);
  const activity1 = manipulated._images.find((shot) => shot.name.startsWith('activity-1'));
  const activity2 = manipulated._images.find((shot) => shot.name.startsWith('activity-2'));
  assert.ok(activity1 && activity2);
  activity2.dataUrl = activity1.dataUrl;
  const verdict = await evaluateContract(manipulated, { minFps: 10, bgColor: '#101426' });
  assert.equal(verdict.passed, false);
  assert.equal(verdict.failures.some((failure) => failure.id === 'visual_activity'), true);
} else if (caseId === 'gp-visual-fast-terminal-pass') {
  const report = await runSession({ root: fastSuccessDir, seconds: 5 });
  const verdict = await evaluateContract(report, { minFps: 10, bgColor: '#101426' });
  const late2 = report._images.find((shot) => shot.name.startsWith('shot-2'));
  const late3 = report._images.find((shot) => shot.name.startsWith('shot-3'));
  assert.equal(report.endSnapshot?.state, 'won');
  assert.ok(late2 && late3);
  assert.equal(late2.dataUrl, late3.dataUrl);
  assert.equal(verdict.checks.find((check) => check.id === 'visual_activity')?.pass, true, JSON.stringify(verdict.failures));
  assert.equal(verdict.passed, true, JSON.stringify(verdict.failures));
} else if (caseId === 'gp-visual-static-live-reject') {
  const report = await runSession({ root: staticLiveDir, seconds: 5 });
  const verdict = await evaluateContract(report, { minFps: 10, bgColor: '#101426' });
  assert.equal(report.endSnapshot?.state, 'playing');
  assert.equal(verdict.checks.find((check) => check.id === 'visual_activity')?.pass, false);
  assert.equal(verdict.failures.some((failure) => failure.id === 'visual_activity'), true);
} else {
  throw new Error(`unsupported causality/visual corpus case: ${caseId}`);
}

console.log(JSON.stringify({ caseId, observation: 'PASS' }));
