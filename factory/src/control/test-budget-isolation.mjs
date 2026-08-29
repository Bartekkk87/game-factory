import assert from 'node:assert/strict';
import {
  costReport,
  openLogicalCall,
  reserveAttempt,
  runWithBudget,
  settleAttempt,
  settleUncertainAttempt
} from './budget.mjs';

const stageBudgets = {
  repair: { maxCalls: 2, maxUsd: 2 },
  polish: { maxCalls: 2, maxUsd: 2 },
  freshRebuild: { maxCalls: 2, maxUsd: 2 }
};

async function scopedRun(runId, usage, uncertain = false) {
  return runWithBudget({ runId, budgetUsd: 5, stageBudgets }, async () => {
    const logical = openLogicalCall({
      role: 'engineer',
      operation: 'build',
      provider: 'openai',
      model: 'gpt-4o-mini',
      system: `system-${runId}`,
      user: `user-${runId}`
    });
    await new Promise((resolve) => setImmediate(resolve));
    const reservation = reserveAttempt(logical, { transportAttempt: 1, maxTokens: 1000 });
    await new Promise((resolve) => setTimeout(resolve, runId === 'run-a' ? 6 : 1));
    if (uncertain) settleUncertainAttempt(reservation, new Error('fixture uncertain transport'));
    else settleAttempt(reservation, { usage });
    const report = costReport();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(costReport().runId, runId, 'async continuation lost its run-local ledger');
    return report;
  });
}

const [a, b] = await Promise.all([
  scopedRun('run-a', { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }),
  scopedRun('run-b', { prompt_tokens: 200, completion_tokens: 40, total_tokens: 240 }, true)
]);

assert.equal(a.schema, 'game-factory.cost-ledger/v2');
assert.equal(b.schema, 'game-factory.cost-ledger/v2');
assert.equal(a.runId, 'run-a');
assert.equal(b.runId, 'run-b');
assert.equal(a.attempts.length, 1);
assert.equal(b.attempts.length, 1);
assert.equal(a.attempts[0].logicalCallId, 'call-1');
assert.equal(b.attempts[0].logicalCallId, 'call-1');
assert.equal(a.accountingComplete, true);
assert.equal(a.pass, true);
assert.equal(b.accountingComplete, false);
assert.equal(b.pass, false);
assert.equal(a.violations.some((item) => item.reason === 'billing_uncertain'), false);
assert.equal(b.violations.some((item) => item.reason === 'billing_uncertain'), true);
assert.equal(a.tokens, 120);
assert.equal(b.tokens, 0, 'uncertain run must not inherit settled usage from the other run');

console.log('run-scoped budget isolation selftest: PASS');
