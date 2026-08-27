function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));
}
function bump(map, key, amount = 1) { if (key) map.set(key, (map.get(key) || 0) + amount); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }

export function aggregateEvidence({ runEvidence = [], ownerFeedback = [] } = {}) {
  const failures = new Map(), costsByRole = new Map(), costsByModel = new Map(), costsByOperation = new Map(), classifications = new Map(), ownerVerdicts = new Map();
  let technicalFailures = 0, productFidelityFailures = 0, repairs = 0, rebuilds = 0, polishes = 0, tokens = 0, costUsd = 0;
  const experience = [];
  const runs = [...runEvidence].sort((a, b) => String(a.runId || a.id || '').localeCompare(String(b.runId || b.id || '')));
  for (const run of runs) {
    const events = Array.isArray(run.events) ? run.events : [];
    const attempts = Array.isArray(run.attempts) ? run.attempts : [];
    const calls = Array.isArray(run.llmCalls) ? run.llmCalls : Array.isArray(run.calls) ? run.calls : [];
    const gates = run.gates || run.result || {};
    if (gates.technical === false || gates.technical?.passed === false) technicalFailures++;
    if (gates.productFidelity === false || gates.productFidelity?.passed === false) productFidelityFailures++;
    repairs += number(run.repairCount); rebuilds += number(run.freshRebuildCount); polishes += number(run.polishCount);
    const score = run.experience?.overall ?? run.experienceScore ?? gates.experience?.overall;
    if (Number.isFinite(Number(score))) experience.push(Number(score));
    for (const item of [...events, ...attempts]) {
      const kind = String(item.kind || item.type || item.operation || '').toLowerCase();
      if (kind.includes('repair')) repairs++; if (kind.includes('rebuild')) rebuilds++; if (kind.includes('polish')) polishes++;
      bump(failures, item.failureSignature || item.signature || item.errorCode);
    }
    for (const call of calls) {
      const callCost = number(call.costUsd ?? call.cost), callTokens = number(call.tokens ?? call.totalTokens ?? call.usage?.total_tokens);
      costUsd += callCost; tokens += callTokens;
      bump(costsByRole, call.role, callCost); bump(costsByModel, call.actualModel || call.responseModel || call.model, callCost); bump(costsByOperation, call.operation, callCost);
    }
    costUsd += number(run.costUsd ?? run.cost?.totalUsd); tokens += number(run.tokens ?? run.usage?.total_tokens);
  }
  const feedback = [...ownerFeedback].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
  for (const item of feedback) {
    bump(ownerVerdicts, item.parsedCommand || item.verdict);
    for (const claim of item.classificationClaims || []) bump(classifications, claim.type || claim);
  }
  return {
    schemaVersion: 'learning-aggregate-v1',
    input: { runIds: runs.map((r) => String(r.runId || r.id || '')).filter(Boolean), ownerFeedbackIds: feedback.map((f) => f.id).filter(Boolean) },
    failures: { signatures: sortedObject(failures), recurring: [...failures.entries()].filter(([, c]) => c >= 2).map(([signature, count]) => ({ signature, count })).sort((a, b) => a.signature.localeCompare(b.signature)), technicalFailures, productFidelityFailures },
    convergence: { repairCount: repairs, freshRebuildCount: rebuilds, polishCount: polishes },
    experience: { scores: experience, latest: experience.length ? experience.at(-1) : null },
    owner: { verdicts: sortedObject(ownerVerdicts), classificationClaims: sortedObject(classifications) },
    economics: { costUsd, tokens, costByRole: sortedObject(costsByRole), costByModel: sortedObject(costsByModel), costByOperation: sortedObject(costsByOperation) }
  };
}
