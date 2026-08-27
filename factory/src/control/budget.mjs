import { getModelPricing, UnknownModelPricingError } from '../llm/model-registry.mjs';

const roundUsd = (n) => Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6;
const now = () => new Date().toISOString();

export class BudgetError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'BudgetError';
    this.code = 'BUDGET_BLOCKED';
    this.details = details;
    this.fatal = true;
  }
}

let state = null;

function active() {
  if (!state) throw new BudgetError('Run budget is not initialized', { reason: 'budget_not_initialized' });
  return state;
}

function scopeFor(operation) {
  if (operation === 'repair') return 'repair';
  if (operation === 'polish') return 'polish';
  if (operation === 'rebuild') return 'freshRebuild';
  return null;
}

function addViolation(reason, details = {}) {
  const s = active();
  const violation = { reason, at: now(), ...details };
  s.violations.push(violation);
  return violation;
}

function block(reason, message, details = {}) {
  const violation = addViolation(reason, details);
  throw new BudgetError(message, violation);
}

export function beginRunBudget({ runId, budgetUsd, stageBudgets = {} }) {
  if (!Number.isFinite(Number(budgetUsd)) || Number(budgetUsd) <= 0) {
    throw new BudgetError('Run budget must be a positive USD amount', { reason: 'invalid_run_budget', budgetUsd });
  }
  const normalizedStages = {};
  for (const name of ['repair', 'polish', 'freshRebuild']) {
    const cfg = stageBudgets[name] ?? {};
    normalizedStages[name] = {
      maxCalls: Number.isFinite(Number(cfg.maxCalls)) ? Math.max(0, Math.floor(Number(cfg.maxCalls))) : null,
      maxUsd: Number.isFinite(Number(cfg.maxUsd)) ? Math.max(0, Number(cfg.maxUsd)) : null
    };
  }
  state = {
    schema: 'game-factory.cost-ledger/v1',
    runId,
    budgetUsd: Number(budgetUsd),
    startedAt: now(),
    spentUsd: 0,
    reservedUsd: 0,
    accountingComplete: true,
    sequence: 0,
    logicalSequence: 0,
    stageBudgets: normalizedStages,
    stageCalls: { repair: 0, polish: 0, freshRebuild: 0 },
    stageSpentUsd: { repair: 0, polish: 0, freshRebuild: 0 },
    stageReservedUsd: { repair: 0, polish: 0, freshRebuild: 0 },
    logicalCalls: [],
    attempts: [],
    violations: []
  };
  return costReport();
}

function estimateInputTokens({ system = '', user = '', images = [] }) {
  // UTF-8 bytes are intentionally conservative for text pre-authorization.
  // Image inputs are reserved at a deliberately high fixed allowance; L2 can
  // replace this with provider/model-specific image accounting.
  const textBytes = Buffer.byteLength(String(system), 'utf8') + Buffer.byteLength(String(user), 'utf8');
  return textBytes + 256 + (Array.isArray(images) ? images.length : 0) * 10000;
}

export function openLogicalCall({ role, operation = role, provider, model, system = '', user = '', images = [] }) {
  const s = active();
  if (!s.accountingComplete) {
    block('accounting_incomplete', 'A prior LLM request has uncertain billing; refusing further paid calls');
  }
  if (s.violations.length) {
    throw new BudgetError('A prior budget violation already closed this run', { reason: 'prior_budget_violation' });
  }

  let pricing;
  try {
    pricing = getModelPricing(provider, model);
  } catch (e) {
    if (e instanceof UnknownModelPricingError) {
      block('pricing_unknown', e.message, { provider, model });
    }
    throw e;
  }

  const scope = scopeFor(operation);
  if (scope) {
    const cfg = s.stageBudgets[scope];
    if (cfg.maxCalls !== null && s.stageCalls[scope] >= cfg.maxCalls) {
      block('stage_call_limit', `${scope} call budget exhausted`, {
        scope,
        maxCalls: cfg.maxCalls,
        attemptedCall: s.stageCalls[scope] + 1
      });
    }
    s.stageCalls[scope] += 1;
  }

  const logical = {
    id: `call-${++s.logicalSequence}`,
    role,
    operation,
    scope,
    provider,
    model,
    pricing,
    estimatedInputTokens: estimateInputTokens({ system, user, images }),
    openedAt: now()
  };
  s.logicalCalls.push(logical);
  return logical;
}

function estimateReservationUsd(logical, maxTokens) {
  return (logical.estimatedInputTokens * logical.pricing.inputUsdPerM + Number(maxTokens) * logical.pricing.outputUsdPerM) / 1_000_000;
}

export function reserveAttempt(logical, { transportAttempt, maxTokens }) {
  const s = active();
  if (!s.accountingComplete) {
    block('accounting_incomplete', 'A prior LLM request has uncertain billing; refusing further paid calls');
  }
  const reserveUsd = estimateReservationUsd(logical, maxTokens);
  const projectedRun = s.spentUsd + s.reservedUsd + reserveUsd;
  if (projectedRun > s.budgetUsd + 1e-12) {
    block('run_budget_precheck', 'Next LLM request does not fit inside remaining run budget', {
      role: logical.role,
      operation: logical.operation,
      model: logical.model,
      reserveUsd: roundUsd(reserveUsd),
      spentUsd: roundUsd(s.spentUsd),
      budgetUsd: s.budgetUsd
    });
  }

  if (logical.scope) {
    const cfg = s.stageBudgets[logical.scope];
    const projectedStage = s.stageSpentUsd[logical.scope] + s.stageReservedUsd[logical.scope] + reserveUsd;
    if (cfg.maxUsd !== null && projectedStage > cfg.maxUsd + 1e-12) {
      block('stage_budget_precheck', `Next ${logical.scope} request exceeds its USD budget`, {
        scope: logical.scope,
        role: logical.role,
        model: logical.model,
        reserveUsd: roundUsd(reserveUsd),
        spentUsd: roundUsd(s.stageSpentUsd[logical.scope]),
        budgetUsd: cfg.maxUsd
      });
    }
  }

  const entry = {
    id: `llm-attempt-${++s.sequence}`,
    logicalCallId: logical.id,
    role: logical.role,
    operation: logical.operation,
    scope: logical.scope,
    provider: logical.provider,
    model: logical.model,
    transportAttempt,
    pricing: logical.pricing,
    estimatedInputTokens: logical.estimatedInputTokens,
    maxOutputTokens: Number(maxTokens),
    reservedUsd: reserveUsd,
    costUsd: 0,
    status: 'reserved',
    startedAt: now()
  };
  s.reservedUsd += reserveUsd;
  if (logical.scope) s.stageReservedUsd[logical.scope] += reserveUsd;
  s.attempts.push(entry);
  return entry.id;
}

function entryFor(id) {
  const s = active();
  const entry = s.attempts.find((x) => x.id === id);
  if (!entry) throw new Error(`Unknown budget reservation: ${id}`);
  return entry;
}

function releaseReservation(entry) {
  const s = active();
  if (entry.status !== 'reserved') return;
  s.reservedUsd = Math.max(0, s.reservedUsd - entry.reservedUsd);
  if (entry.scope) s.stageReservedUsd[entry.scope] = Math.max(0, s.stageReservedUsd[entry.scope] - entry.reservedUsd);
}

export function releaseAttempt(id, { status = 'not_billed', error = null } = {}) {
  const entry = entryFor(id);
  if (entry.status !== 'reserved') return entry;
  releaseReservation(entry);
  entry.status = status;
  entry.error = error ? String(error).slice(0, 500) : null;
  entry.endedAt = now();
  return entry;
}

function usageTokens(usage = {}) {
  const input = Number.isFinite(Number(usage.prompt_tokens))
    ? Number(usage.prompt_tokens)
    : (Number.isFinite(Number(usage.input_tokens)) ? Number(usage.input_tokens) : null);
  const output = Number.isFinite(Number(usage.completion_tokens))
    ? Number(usage.completion_tokens)
    : (Number.isFinite(Number(usage.output_tokens)) ? Number(usage.output_tokens) : null);
  const cachedRaw = usage.prompt_tokens_details?.cached_tokens ?? usage.input_tokens_details?.cached_tokens ?? 0;
  const cached = Number.isFinite(Number(cachedRaw)) ? Math.max(0, Number(cachedRaw)) : 0;
  return { input, output, cached };
}

function modelCost(entry, tokens) {
  if (tokens.input === null || tokens.output === null) return null;
  const cached = Math.min(tokens.cached, tokens.input);
  const uncached = Math.max(0, tokens.input - cached);
  return (
    uncached * entry.pricing.inputUsdPerM +
    cached * entry.pricing.cachedInputUsdPerM +
    tokens.output * entry.pricing.outputUsdPerM
  ) / 1_000_000;
}

export function settleAttempt(id, { usage = {}, providerCostUsd = null } = {}) {
  const s = active();
  const entry = entryFor(id);
  if (entry.status !== 'reserved') throw new Error(`Reservation ${id} is already closed`);
  releaseReservation(entry);

  const tokens = usageTokens(usage);
  const calculated = modelCost(entry, tokens);
  const providerCost = Number.isFinite(Number(providerCostUsd)) && Number(providerCostUsd) >= 0
    ? Number(providerCostUsd)
    : null;

  let charged;
  let source;
  if (providerCost !== null) {
    charged = providerCost;
    source = 'provider-reported';
  } else if (calculated !== null) {
    charged = calculated;
    source = 'model-registry';
  } else {
    charged = entry.reservedUsd;
    source = 'conservative-reservation';
    s.accountingComplete = false;
    addViolation('usage_missing', {
      attemptId: entry.id,
      role: entry.role,
      model: entry.model,
      chargedUsd: roundUsd(charged)
    });
  }

  entry.usage = {
    inputTokens: tokens.input,
    cachedInputTokens: tokens.cached,
    outputTokens: tokens.output,
    totalTokens: Number.isFinite(Number(usage.total_tokens))
      ? Number(usage.total_tokens)
      : (tokens.input !== null && tokens.output !== null ? tokens.input + tokens.output : null)
  };
  entry.providerReportedCostUsd = providerCost;
  entry.modelCalculatedCostUsd = calculated;
  entry.costUsd = charged;
  entry.costSource = source;
  entry.status = 'settled';
  entry.endedAt = now();

  s.spentUsd += charged;
  if (entry.scope) s.stageSpentUsd[entry.scope] += charged;
  if (s.spentUsd > s.budgetUsd + 1e-12) {
    addViolation('run_budget_overspend', { spentUsd: roundUsd(s.spentUsd), budgetUsd: s.budgetUsd });
  }
  if (entry.scope) {
    const cap = s.stageBudgets[entry.scope].maxUsd;
    if (cap !== null && s.stageSpentUsd[entry.scope] > cap + 1e-12) {
      addViolation('stage_budget_overspend', {
        scope: entry.scope,
        spentUsd: roundUsd(s.stageSpentUsd[entry.scope]),
        budgetUsd: cap
      });
    }
  }
  return entry;
}

export function settleUncertainAttempt(id, error) {
  const s = active();
  const entry = entryFor(id);
  if (entry.status !== 'reserved') return entry;
  releaseReservation(entry);
  entry.costUsd = entry.reservedUsd;
  entry.costSource = 'conservative-reservation-uncertain-transport';
  entry.status = 'billing-uncertain';
  entry.error = String(error?.message ?? error ?? 'unknown transport error').slice(0, 500);
  entry.endedAt = now();
  s.spentUsd += entry.costUsd;
  if (entry.scope) s.stageSpentUsd[entry.scope] += entry.costUsd;
  s.accountingComplete = false;
  addViolation('billing_uncertain', {
    attemptId: entry.id,
    role: entry.role,
    model: entry.model,
    chargedUsd: roundUsd(entry.costUsd)
  });
  return entry;
}

function aggregateAttempts(attempts, key) {
  const out = {};
  for (const attempt of attempts) {
    const k = attempt[key] ?? 'unknown';
    if (!out[k]) out[k] = { costUsd: 0, attempts: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
    out[k].costUsd += attempt.costUsd || 0;
    out[k].attempts += 1;
    out[k].inputTokens += attempt.usage?.inputTokens || 0;
    out[k].cachedInputTokens += attempt.usage?.cachedInputTokens || 0;
    out[k].outputTokens += attempt.usage?.outputTokens || 0;
  }
  for (const value of Object.values(out)) value.costUsd = roundUsd(value.costUsd);
  return out;
}

export function costReport() {
  if (!state) {
    return {
      schema: 'game-factory.cost-ledger/v1',
      runId: null,
      budgetUsd: 0,
      costUsd: 0,
      spentUsd: 0,
      remainingUsd: 0,
      tokens: 0,
      accountingComplete: false,
      pass: false,
      stageBudgets: {},
      byRole: {},
      byModel: {},
      byOperation: {},
      attempts: [],
      violations: [{ reason: 'budget_not_initialized' }]
    };
  }
  const settled = state.attempts;
  const totals = settled.reduce((acc, item) => {
    acc.input += item.usage?.inputTokens || 0;
    acc.cached += item.usage?.cachedInputTokens || 0;
    acc.output += item.usage?.outputTokens || 0;
    acc.total += item.usage?.totalTokens || 0;
    return acc;
  }, { input: 0, cached: 0, output: 0, total: 0 });
  const spent = roundUsd(state.spentUsd);
  const report = {
    schema: state.schema,
    runId: state.runId,
    budgetUsd: state.budgetUsd,
    costUsd: spent,
    spentUsd: spent,
    reservedUsd: roundUsd(state.reservedUsd),
    remainingUsd: roundUsd(Math.max(0, state.budgetUsd - state.spentUsd - state.reservedUsd)),
    tokens: totals.total,
    tokenBreakdown: {
      inputTokens: totals.input,
      cachedInputTokens: totals.cached,
      outputTokens: totals.output,
      totalTokens: totals.total
    },
    accountingComplete: state.accountingComplete,
    pass: state.accountingComplete && state.violations.length === 0 && state.spentUsd <= state.budgetUsd + 1e-12,
    stageBudgets: Object.fromEntries(Object.entries(state.stageBudgets).map(([name, cfg]) => [name, {
      ...cfg,
      calls: state.stageCalls[name],
      spentUsd: roundUsd(state.stageSpentUsd[name]),
      remainingUsd: cfg.maxUsd === null ? null : roundUsd(Math.max(0, cfg.maxUsd - state.stageSpentUsd[name] - state.stageReservedUsd[name]))
    }])),
    byRole: aggregateAttempts(settled, 'role'),
    byModel: aggregateAttempts(settled, 'model'),
    byOperation: aggregateAttempts(settled, 'operation'),
    attempts: settled.map((x) => ({
      ...x,
      reservedUsd: roundUsd(x.reservedUsd),
      costUsd: roundUsd(x.costUsd),
      modelCalculatedCostUsd: x.modelCalculatedCostUsd === null || x.modelCalculatedCostUsd === undefined
        ? null
        : roundUsd(x.modelCalculatedCostUsd),
      providerReportedCostUsd: x.providerReportedCostUsd === null || x.providerReportedCostUsd === undefined
        ? null
        : roundUsd(x.providerReportedCostUsd)
    })),
    violations: state.violations.map((x) => ({ ...x }))
  };
  return report;
}
