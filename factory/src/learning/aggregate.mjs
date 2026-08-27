function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));
}
function bump(map, key, amount = 1) { if (key) map.set(String(key), (map.get(String(key)) || 0) + amount); }
function noteRun(map, key, id) {
  const signature = String(key || '').trim();
  const run = String(id || '').trim();
  if (!signature || !run) return;
  if (!map.has(signature)) map.set(signature, new Set());
  map.get(signature).add(run);
}
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function runId(run) { return String(run?.runId || run?.id || run?.run?.id || ''); }
function gateFailed(gate) {
  if (gate === false) return true;
  if (!gate || typeof gate !== 'object') return false;
  return gate.pass === false || gate.passed === false;
}
function recurring(map, runMembership = null) {
  return [...map.entries()]
    .filter(([, count]) => Number(count) >= 2)
    .map(([signature, count]) => {
      const runIds = runMembership ? [...(runMembership.get(signature) || [])].map(String).sort() : [];
      return {
        signature,
        count,
        ...(runMembership ? { runCount: runIds.length, runIds } : {})
      };
    })
    .sort((a, b) => a.signature.localeCompare(b.signature));
}
function detailClass(detail) {
  const text = String(detail || '').toLowerCase();
  if (text.includes('too early')) return 'correlated-too-early';
  if (text.includes('absent') || text.includes('missing')) return 'missing';
  if (text.includes('runtime')) return 'runtime';
  return 'failed';
}
function failureSignature(kind, failure) {
  if (failure?.failureSignature || failure?.signature || failure?.errorCode) return failure.failureSignature || failure.signature || failure.errorCode;
  return [
    kind || 'attempt',
    failure?.id || failure?.checkId || null,
    failure?.requirementId || null,
    failure?.probeId || null,
    failure?.kind || null,
    failure?.eventType || null,
    detailClass(failure?.detail)
  ].filter(Boolean).join(':');
}

export function aggregateEvidence({ runEvidence = [], attemptEvidence = [], ownerFeedback = [] } = {}) {
  const failures = new Map();
  const failureRuns = new Map();
  const positives = new Map();
  const costsByRole = new Map();
  const costsByModel = new Map();
  const costsByOperation = new Map();
  const classifications = new Map();
  const ownerVerdicts = new Map();
  let technicalFailures = 0;
  let productFidelityFailures = 0;
  let attemptTechnicalFailures = 0;
  let attemptProductFidelityFailures = 0;
  let repairs = 0;
  let rebuilds = 0;
  let polishes = 0;
  let tokens = 0;
  let costUsd = 0;
  const experience = [];

  const runs = [...runEvidence].sort((a, b) => runId(a).localeCompare(runId(b)));
  for (const run of runs) {
    const id = runId(run);
    const events = Array.isArray(run.events) ? run.events : [];
    const attempts = Array.isArray(run.attempts) ? run.attempts : [];
    const costs = run.costs || {};
    const calls = Array.isArray(run.llmCalls)
      ? run.llmCalls
      : Array.isArray(run.calls)
        ? run.calls
        : Array.isArray(costs.attempts)
          ? costs.attempts
          : [];
    const gates = run.gates || run.result || {};

    if (gateFailed(gates.technical)) technicalFailures++;
    if (gateFailed(gates.productFidelity)) productFidelityFailures++;

    const repairCount = run.repairCount ?? costs.stageBudgets?.repair?.calls ?? costs.byOperation?.repair?.attempts;
    const rebuildCount = run.freshRebuildCount ?? costs.stageBudgets?.freshRebuild?.calls ?? costs.byOperation?.rebuild?.attempts;
    const polishCount = run.polishCount ?? costs.stageBudgets?.polish?.calls ?? costs.byOperation?.polish?.attempts;
    repairs += number(repairCount);
    rebuilds += number(rebuildCount);
    polishes += number(polishCount);

    const score = run.experience?.overall ?? run.experienceScore ?? gates.experience?.overall ?? gates.experience?.score;
    if (Number.isFinite(Number(score))) experience.push(Number(score));

    for (const item of [...events, ...attempts]) {
      const signature = item.failureSignature || item.signature || item.errorCode;
      bump(failures, signature);
      noteRun(failureRuns, signature, id);
    }
    for (const item of run.positivePatterns || []) bump(positives, typeof item === 'string' ? item : item.signature || item.id || item.pattern);

    for (const call of calls) {
      const callCost = number(call.costUsd ?? call.cost);
      const callTokens = number(call.tokens ?? call.totalTokens ?? call.usage?.totalTokens ?? call.usage?.total_tokens);
      costUsd += callCost;
      tokens += callTokens;
      bump(costsByRole, call.role, callCost);
      bump(costsByModel, call.actualModel || call.responseModelId || call.responseModel || call.model, callCost);
      bump(costsByOperation, call.operation, callCost);
    }

    if (!calls.length) {
      costUsd += number(run.costUsd ?? run.cost?.totalUsd ?? costs.costUsd ?? costs.spentUsd);
      tokens += number(run.tokens ?? run.usage?.totalTokens ?? run.usage?.total_tokens ?? costs.tokens ?? costs.tokenBreakdown?.totalTokens);
      for (const [role, value] of Object.entries(costs.byRole || {})) bump(costsByRole, role, number(value?.costUsd ?? value));
      for (const [model, value] of Object.entries(costs.byModel || {})) bump(costsByModel, model, number(value?.costUsd ?? value));
      for (const [operation, value] of Object.entries(costs.byOperation || {})) bump(costsByOperation, operation, number(value?.costUsd ?? value));
    }
  }

  const attemptInputs = [...attemptEvidence].sort((a, b) => {
    const ak = `${a.runId || ''}:${a.attemptId || ''}:${a.kind || ''}`;
    const bk = `${b.runId || ''}:${b.attemptId || ''}:${b.kind || ''}`;
    return ak.localeCompare(bk);
  });
  for (const item of attemptInputs) {
    const kind = String(item.kind || '').toLowerCase();
    const evidence = item.evidence || item;
    if (!gateFailed(evidence)) continue;
    if (kind === 'technical') attemptTechnicalFailures++;
    if (kind === 'product-fidelity') attemptProductFidelityFailures++;
    for (const failure of Array.isArray(evidence.failures) ? evidence.failures : []) {
      const signature = failureSignature(kind, failure);
      bump(failures, signature);
      noteRun(failureRuns, signature, item.runId);
    }
  }

  const feedback = [...ownerFeedback].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
  for (const item of feedback) {
    bump(ownerVerdicts, item.parsedCommand || item.verdict);
    for (const claim of item.classificationClaims || []) bump(classifications, claim.type || claim);
  }

  return {
    schemaVersion: 'learning-aggregate-v1',
    input: {
      runIds: runs.map(runId).filter(Boolean),
      attemptEvidence: attemptInputs.map((a) => ({ runId: String(a.runId || ''), attemptId: String(a.attemptId || ''), kind: a.kind || null, sourceRef: a.sourceRef || null })),
      ownerFeedbackIds: feedback.map((f) => f.id).filter(Boolean)
    },
    failures: {
      signatures: sortedObject(failures),
      recurring: recurring(failures, failureRuns),
      technicalFailures,
      productFidelityFailures,
      attemptTechnicalFailures,
      attemptProductFidelityFailures
    },
    positives: {
      signatures: sortedObject(positives),
      recurring: recurring(positives)
    },
    convergence: {
      repairCount: repairs,
      freshRebuildCount: rebuilds,
      polishCount: polishes
    },
    experience: {
      scores: experience,
      latest: experience.length ? experience.at(-1) : null
    },
    owner: {
      verdicts: sortedObject(ownerVerdicts),
      classificationClaims: sortedObject(classifications)
    },
    economics: {
      costUsd,
      tokens,
      costByRole: sortedObject(costsByRole),
      costByModel: sortedObject(costsByModel),
      costByOperation: sortedObject(costsByOperation)
    }
  };
}
