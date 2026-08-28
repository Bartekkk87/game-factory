import assert from 'node:assert/strict';
import './test-repair-policy.mjs';
import './test-control-reliability.mjs';
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

// Real token accounting is stored per role/model/attempt (below-budget fixture).
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
assert.deepEqual(report.tokenBreakdown, {
  inputTokens: 1000,
  cachedInputTokens: 200,
  outputTokens: 500,
  totalTokens: 1500
});
assert.equal(report.byRole.engineer.attempts, 1);
assert.equal(report.byModel['gpt-4o'].attempts, 1);
assert.equal(report.byOperation.repair.attempts, 1);
assert.equal(report.attempts[0].transportAttempt, 1);
assert.equal(report.pass, true);

// A call that cannot fit the remaining budget is rejected BEFORE transport (above-budget fixture).
beginRunBudget({ runId: 'precheck-test', budgetUsd: 0.001, stageBudgets: stages });
const tooLarge = openLogicalCall({ role: 'engineer', operation: 'build', provider: 'openai', model: 'gpt-4o', system: 's', user: 'u' });
assert.throws(
  () => reserveAttempt(tooLarge, { transportAttempt: 1, maxTokens: 12000 }),
  (e) => e instanceof BudgetError && e.details.reason === 'run_budget_precheck'
);
assert.equal(costReport().attempts.length, 0);
assert.equal(costReport().pass, false);

// Exact-budget reservation is allowed; the guard rejects only projected overspend.
// Empty system+user text is conservatively estimated as 256 input tokens.
const exactBudgetUsd = (256 * 0.15 + 1000 * 0.6) / 1_000_000;
const roundedExactBudgetUsd = Math.round(exactBudgetUsd * 1e6) / 1e6;
beginRunBudget({ runId: 'exact-budget-test', budgetUsd: exactBudgetUsd, stageBudgets: stages });
const exactLogical = openLogicalCall({ role: 'engineer', operation: 'build', provider: 'openai', model: 'gpt-4o-mini', system: '', user: '' });
const exactReservation = reserveAttempt(exactLogical, { transportAttempt: 1, maxTokens: 1000 });
settleAttempt(exactReservation, {
  usage: { prompt_tokens: 256, completion_tokens: 1000, total_tokens: 1256 }
});
assert.equal(costReport().pass, true);
closeTo(costReport().spentUsd, roundedExactBudgetUsd);
closeTo(costReport().remainingUsd, 0);

// Pricing overrides remain explicit and attributable for OpenAI-compatible/self-hosted lanes.
const savedPricingJson = process.env.GF_MODEL_PRICING_JSON;
try {
  process.env.GF_MODEL_PRICING_JSON = JSON.stringify({
    'openai:fixture-priced': { inputUsdPerM: 1, cachedInputUsdPerM: 0.5, outputUsdPerM: 2 }
  });
  assert.deepEqual(getModelPricing('openai', 'fixture-priced'), {
    inputUsdPerM: 1,
    cachedInputUsdPerM: 0.5,
    outputUsdPerM: 2,
    source: 'GF_MODEL_PRICING_JSON'
  });
} finally {
  if (savedPricingJson === undefined) delete process.env.GF_MODEL_PRICING_JSON;
  else process.env.GF_MODEL_PRICING_JSON = savedPricingJson;
}

// Unknown pricing fails closed before transport and records a budget violation.
beginRunBudget({ runId: 'unknown-price-test', budgetUsd: 5, stageBudgets: stages });
assert.throws(
  () => openLogicalCall({ role: 'engineer', operation: 'build', provider: 'openai', model: 'definitely-unpriced', system: 's', user: 'u' }),
  (e) => e instanceof BudgetError && e.details.reason === 'pricing_unknown'
);
assert.equal(costReport().attempts.length, 0);
assert.equal(costReport().pass, false);
assert.equal(costReport().violations.some((v) => v.reason === 'pricing_unknown'), true);

// Missing usage is never treated as zero cost. The conservative reservation is
// charged, accounting becomes incomplete, and every subsequent paid call fails closed.
beginRunBudget({ runId: 'unknown-usage-test', budgetUsd: 5, stageBudgets: stages });
const uncertainLogical = openLogicalCall({ role: 'engineer', operation: 'build', provider: 'openai', model: 'gpt-4o-mini', system: 's', user: 'u' });
const uncertainReservation = reserveAttempt(uncertainLogical, { transportAttempt: 1, maxTokens: 1000 });
const uncertain = settleAttempt(uncertainReservation, { usage: {} });
assert.equal(uncertain.costUsd > 0, true);
assert.equal(uncertain.costSource, 'conservative-reservation');
assert.equal(costReport().accountingComplete, false);
assert.equal(costReport().pass, false);
assert.throws(
  () => openLogicalCall({ role: 'engineer', operation: 'build', provider: 'openai', model: 'gpt-4o-mini', system: 's', user: 'u' }),
  (e) => e instanceof BudgetError && e.details.reason === 'accounting_incomplete'
);

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
