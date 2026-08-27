import assert from 'node:assert/strict';
import { evaluateRepairProgress, retainBestFailed } from './repair-policy.mjs';

function bundle(attempt, failures, pageErrors = []) {
  return {
    attempt,
    failures: Array.from({ length: failures }, (_, i) => ({ id: `f-${attempt}-${i}` })),
    consoleErrors: [],
    pageErrors,
    probeErrors: []
  };
}

function candidate(attempt, failures, pageErrors = []) {
  return {
    design: { id: `design-${attempt}` },
    tech: { id: `tech-${attempt}` },
    bundle: bundle(attempt, failures, pageErrors)
  };
}

let best = null;
for (const current of [candidate(1, 9), candidate(2, 5), candidate(3, 2)]) {
  const retained = retainBestFailed({ best, current });
  best = retained.best;
  assert.equal(best.design.id, `design-${current.bundle.attempt}`);
  assert.equal(retained.evaluation.acceptAsBest, true);
}

assert.equal(best.design.id, 'design-3', 'Attempt 3 must be the best Harbor Courier base');

const attempt4 = candidate(4, 8);
let retained = retainBestFailed({ best, current: attempt4 });
assert.equal(retained.evaluation.regressed, true);
assert.equal(retained.evaluation.reason, 'more-failed-checks');
assert.equal(retained.best.design.id, 'design-3', '8-check regression must not replace 2-check best');

const ellipseError = "pageerror: Failed to execute 'ellipse' on 'CanvasRenderingContext2D': 7 arguments required, but only 6 present.";
const runtimeRegression = candidate(5, 1, [ellipseError]);
retained = retainBestFailed({ best, current: runtimeRegression });
assert.equal(retained.evaluation.regressed, true);
assert.equal(retained.evaluation.reason, 'new-runtime-error');
assert.deepEqual(retained.evaluation.newRuntimeErrors, [ellipseError]);
assert.equal(retained.best.design.id, 'design-3', 'new runtime error must preserve prior clean best even with fewer checks');

const cleanImprovement = candidate(6, 1);
retained = retainBestFailed({ best, current: cleanImprovement });
assert.equal(retained.evaluation.improved, true);
assert.equal(retained.evaluation.reason, 'fewer-failed-checks');
assert.equal(retained.best.design.id, 'design-6');

const noChange = evaluateRepairProgress({ currentBundle: bundle(7, 1), bestBundle: bundle(6, 1) });
assert.equal(noChange.acceptAsBest, false);
assert.equal(noChange.regressed, false);
assert.equal(noChange.reason, 'no-material-improvement');

console.log('repair regression policy OK: best-so-far is retained across 9 -> 5 -> 2 -> 8 and runtime-error regressions');
