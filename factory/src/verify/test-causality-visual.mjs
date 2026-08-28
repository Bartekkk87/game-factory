import assert from 'node:assert/strict';
import path from 'node:path';
import { ROOT } from '../config.mjs';
import { runSession } from './harness.mjs';
import { evaluateContract } from './contract.mjs';

const greenDir = path.join(ROOT, 'examples', 'fixtures', 'green');
const good = await runSession({ root: greenDir, seconds: 5 });
const goodVerdict = await evaluateContract(good, { minFps: 10, bgColor: '#101426' });
assert.equal(good.idleBaseline?.inputMode, 'idle');
assert.equal(good.idleBaseline?.seed, good.seed);
assert.equal(goodVerdict.checks.find((check) => check.id === 'idle_baseline')?.pass, true);
assert.equal(goodVerdict.checks.find((check) => check.id === 'input_causality')?.pass, true);
assert.equal(goodVerdict.checks.find((check) => check.id === 'visual_activity')?.pass, true);
assert.equal(goodVerdict.passed, true, JSON.stringify(goodVerdict.failures));

const autonomousLike = structuredClone(good);
autonomousLike.idleBaseline = {
  ...structuredClone(good.idleBaseline),
  earlySnapshot: structuredClone(good.earlySnapshot),
  midSnapshot: structuredClone(good.midSnapshot),
  endSnapshot: structuredClone(good.endSnapshot),
  timeline: structuredClone(good.timeline)
};
const autonomousVerdict = await evaluateContract(autonomousLike, { minFps: 10, bgColor: '#101426' });
assert.equal(autonomousVerdict.passed, false);
assert.equal(autonomousVerdict.failures.some((failure) => failure.id === 'input_causality'), true);

const staticVisual = structuredClone(good);
const activity1 = staticVisual._images.find((shot) => shot.name.startsWith('activity-1'));
const activity2 = staticVisual._images.find((shot) => shot.name.startsWith('activity-2'));
assert.ok(activity1 && activity2);
activity2.dataUrl = activity1.dataUrl;
const staticVerdict = await evaluateContract(staticVisual, { minFps: 10, bgColor: '#101426' });
assert.equal(staticVerdict.passed, false);
assert.equal(staticVerdict.failures.some((failure) => failure.id === 'visual_activity'), true);

// Regression for the Harbor failure class: live gameplay is visibly active, but the
// product reaches success before the historical late fixed screenshot timestamps.
// The late screenshots are intentionally the same static terminal screen; activity
// must still PASS because the verifier captured its evidence while state=playing.
const fastSuccessDir = path.join(ROOT, 'examples', 'fixtures', 'fast-success-activity');
const fastSuccess = await runSession({ root: fastSuccessDir, seconds: 5 });
const fastSuccessVerdict = await evaluateContract(fastSuccess, { minFps: 10, bgColor: '#101426' });
const fastLate2 = fastSuccess._images.find((shot) => shot.name.startsWith('shot-2'));
const fastLate3 = fastSuccess._images.find((shot) => shot.name.startsWith('shot-3'));
assert.equal(fastSuccess.endSnapshot?.state, 'won');
assert.ok(fastLate2 && fastLate3);
assert.equal(fastLate2.dataUrl, fastLate3.dataUrl, 'fast-success fixture must expose a static terminal-screen pair');
assert.equal(fastSuccessVerdict.checks.find((check) => check.id === 'visual_activity')?.pass, true, JSON.stringify(fastSuccessVerdict.failures));
assert.equal(fastSuccessVerdict.passed, true, JSON.stringify(fastSuccessVerdict.failures));

// Negative control: telemetry/input may progress, but a genuinely static live canvas
// must still fail the unchanged pixel-delta gate.
const staticLiveDir = path.join(ROOT, 'examples', 'fixtures', 'static-live');
const staticLive = await runSession({ root: staticLiveDir, seconds: 5 });
const staticLiveVerdict = await evaluateContract(staticLive, { minFps: 10, bgColor: '#101426' });
assert.equal(staticLive.endSnapshot?.state, 'playing');
assert.equal(staticLiveVerdict.checks.find((check) => check.id === 'visual_activity')?.pass, false);
assert.equal(staticLiveVerdict.failures.some((failure) => failure.id === 'visual_activity'), true);

console.log('verifier causality + visual activity selftest: PASS — live gameplay frames prevent terminal-screen false negatives while static live gameplay still fails');
