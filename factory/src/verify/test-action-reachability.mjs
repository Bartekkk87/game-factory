import path from 'node:path';
import { ROOT } from '../config.mjs';
import { runSession } from './harness.mjs';

const fixtureRoot = path.join(ROOT, 'examples', 'fixtures', 'action-reachability');
const report = await runSession({
  root: fixtureRoot,
  seconds: 40,
  stopStates: ['success']
});

const activeState = report.endSnapshot?.state ?? null;
const activeScore = Number(report.endSnapshot?.score ?? 0);
const idleState = report.idleBaseline?.endSnapshot?.state ?? null;
const idleScore = Number(report.idleBaseline?.endSnapshot?.score ?? 0);
const sequence = report.inputSequence || {};
const reproducesLegacyPolicy = sequence.keyEveryMs === 190
  && sequence.keyHoldMs === 110
  && Array.isArray(sequence.keys)
  && sequence.keys.includes('ArrowLeft')
  && sequence.keys.includes('ArrowRight')
  && sequence.keys.includes('ArrowUp')
  && sequence.keys.includes('ArrowDown');

if (!reproducesLegacyPolicy) {
  console.error(`D-1 baseline invalid: expected current short opposing-key policy, got ${JSON.stringify(sequence)}`);
  process.exit(1);
}

if (activeState === 'success' || activeScore > 0) {
  console.error(`D-1 baseline NOT reproduced: legacy active input unexpectedly reached target (state=${activeState}, score=${activeScore})`);
  process.exit(1);
}

if (idleState === 'success' || idleScore > 0) {
  console.error(`D-1 baseline invalid: idle control unexpectedly reached target (state=${idleState}, score=${idleScore})`);
  process.exit(1);
}

console.log(`D-1 BASELINE REPRODUCED: 40s legacy opposing-pulse harness did not reach the >300px target (active state=${activeState}, score=${activeScore}); idle also did not reach it.`);
