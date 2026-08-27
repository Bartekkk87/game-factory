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
const shot2 = staticVisual._images.find((shot) => shot.name.startsWith('shot-2'));
const shot3 = staticVisual._images.find((shot) => shot.name.startsWith('shot-3'));
assert.ok(shot2 && shot3);
shot3.dataUrl = shot2.dataUrl;
const staticVerdict = await evaluateContract(staticVisual, { minFps: 10, bgColor: '#101426' });
assert.equal(staticVerdict.passed, false);
assert.equal(staticVerdict.failures.some((failure) => failure.id === 'visual_activity'), true);

console.log('verifier causality + visual activity selftest: PASS');
