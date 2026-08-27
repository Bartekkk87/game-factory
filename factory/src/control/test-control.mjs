import assert from 'node:assert/strict';
import {
  beginRunBudget,
  BudgetError,
  costReport,
  openLogicalCall,
  reserveAttempt,
  settleAttempt
} from './budget.mjs';
import { evaluateReleaseGate } from './release-gate.mjs';
import { createRunEvidence, validateRunEvidence } from './evidence.mjs';
import { getModelPricing } from '../llm/model-registry.mjs';

const closeTo = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
const stages = {
  repair: { maxCalls: 2, maxUsd: 2 },
  polish: { maxCalls: 1, maxUsd: 2 },
  freshRebuild: { maxCalls: 1, maxUsd: 2 }
};

// Verified model-specific prices.
assert.deepEqual(getModelPricing('openai', 'gpt-4o-mini'), {
  inputUsdPerM: 0.15,
  cachedInputUsdPerM: 0.075,
  outputUsdPerM: 0.6,
  source: 'openai-official-2026-08-27'
});

// Real token accounting is stored per role/model/attempt.
beginRunBudget({ runId: 'cost-test', budgetUsd: 5, stageBudgets: stages });
const logical = openLogicalCall({ role: 'engineer', operation: 'repair', provider: 'openai', model: 'gpt-4o', system: 's', user: 'u' });
const reservation = reserveAttempt(logical, { transportAttempt: 1, maxTokens: 1000 });
settleAttempt(reservation, {
  usage: {
    prompt_tokens: 1000,
    completion_tokens: 500,
    total_tokens: 1500,
    prompt_tokens_details: { cached_tokens: 200 }
  }
});
const report = costReport();
closeTo(report.costUsd, 0.00725);
assert.equal(report.tokens, 1500);
assert.equal(report.byRole.engineer.attempts, 1);
assert.equal(report.byModel['gpt-4o'].attempts, 1);
assert.equal(report.byOperation.repair.attempts, 1);
assert.equal(report.attempts[0].transportAttempt, 1);
assert.equal(report.pass, true);

// A call that cannot fit the remaining budget is rejected BEFORE transport.
beginRunBudget({ runId: 'precheck-test', budgetUsd: 0.001, stageBudgets: stages });
const tooLarge = openLogicalCall({ role: 'engineer', operation: 'build', provider: 'openai', model: 'gpt-4o', system: 's', user: 'u' });
assert.throws(
  () => reserveAttempt(tooLarge, { transportAttempt: 1, maxTokens: 12000 }),
  (e) => e instanceof BudgetError && e.details.reason === 'run_budget_precheck'
);
assert.equal(costReport().attempts.length, 0);
assert.equal(costReport().pass, false);

// Repair / polish / fresh rebuild paths have explicit independent call caps.
beginRunBudget({ runId: 'stage-test', budgetUsd: 10, stageBudgets: { ...stages, repair: { maxCalls: 1, maxUsd: 5 } } });
openLogicalCall({ role: 'engineer', operation: 'repair', provider: 'openai', model: 'gpt-4o-mini', system: 's', user: 'u' });
assert.throws(
  () => openLogicalCall({ role: 'engineer', operation: 'repair', provider: 'openai', model: 'gpt-4o-mini', system: 's', user: 'u' }),
  (e) => e instanceof BudgetError && e.details.reason === 'stage_call_limit'
);

// Release is deterministic and contains no Auditor input.
const release = evaluateReleaseGate({
  technical: { pass: true },
  productFidelity: { pass: true },
  experienceScore: 6.5,
  budget: { pass: true, spentUsd: 1, budgetUsd: 10 }
});
assert.equal(release.pass, true);
assert.equal(release.reasons.length, 0);
assert.equal(evaluateReleaseGate({
  technical: { pass: true },
  productFidelity: { pass: false },
  experienceScore: 9,
  budget: { pass: true }
}).pass, false);

// Unified evidence schema carries the same four gates plus the full cost ledger.
beginRunBudget({ runId: 'evidence-test', budgetUsd: 10, stageBudgets: stages });
const cleanBudget = costReport();
const cleanRelease = evaluateReleaseGate({
  technical: { pass: true },
  productFidelity: { pass: true },
  experienceScore: 7,
  budget: cleanBudget
});
const evidence = createRunEvidence({
  runId: 'evidence-test',
  status: 'release-eligible',
  source: 'selftest',
  candidateSha: 'abc',
  technical: { checks: [{ id: 'T-01', passed: true }] },
  productFidelity: { status: 'passed', criteria: [{ id: 'MH-01', passed: true }] },
  experience: { scores: { visuals: 7 }, critique: [] },
  budget: cleanBudget,
  releaseGate: cleanRelease,
  audit: { verdict: 'FAIL', summary: 'advisory only' }
});
assert.equal(validateRunEvidence(evidence).gates.release.pass, true);
assert.equal(evidence.audit.advisory, true);
assert.equal(evidence.audit.verdict, 'FAIL');

console.log('control-kernel selftest: PASS');
