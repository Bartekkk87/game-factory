const TERMINAL_STATES = new Set(['success', 'failure']);

function inferDeclaredSeconds(gdd) {
  const text = JSON.stringify(gdd || {});
  const values = [];
  const re = /\b(\d{1,3})\s*(?:-\s*)?(?:seconds?|secs?|s)\b/gi;
  for (const match of text.matchAll(re)) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n >= 5 && n <= 120) values.push(n);
  }
  return values.length ? Math.max(...values) : null;
}

function routeProbe(probe, scenarioIds) {
  const kind = String(probe?.kind || '');
  const state = String(probe?.state || '');
  if (kind === 'state_reached' && state === 'success') return ['success-proof'];
  if (kind === 'state_reached' && state === 'failure') return ['failure-proof'];
  if (kind === 'event_absent') return [...scenarioIds];
  if (kind === 'layout_no_overlap' || kind === 'started_by_early' || kind === 'score_change') return ['base'];
  if (kind === 'event' || kind === 'event_value_change') {
    return scenarioIds.includes('success-proof') ? ['base', 'success-proof'] : ['base'];
  }
  return ['base'];
}

export function validateProofPlan({ gdd, plan } = {}) {
  const probes = Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : [];
  const scenarios = Array.isArray(plan?.scenarios) ? plan.scenarios : [];
  const ids = new Set(scenarios.map((s) => s.id));
  const errors = [];

  if (!ids.has('base')) errors.push('base scenario missing');

  const requiredTerminalStates = [...new Set(
    probes
      .filter((p) => p?.kind === 'state_reached' && TERMINAL_STATES.has(String(p?.state || '')))
      .map((p) => String(p.state))
  )];

  for (const state of requiredTerminalStates) {
    const expectedId = `${state}-proof`;
    const scenario = scenarios.find((s) => s.id === expectedId);
    if (!scenario) {
      errors.push(`${expectedId} scenario missing for required terminal state ${state}`);
      continue;
    }
    if (!Array.isArray(scenario.stopStates) || !scenario.stopStates.includes(state)) {
      errors.push(`${expectedId} does not observe terminal state ${state}`);
    }
    if (!Number.isFinite(Number(scenario.seconds)) || Number(scenario.seconds) <= 0) {
      errors.push(`${expectedId} has invalid observation window`);
    }
  }

  if (requiredTerminalStates.includes('success') && requiredTerminalStates.includes('failure')) {
    const success = scenarios.find((s) => s.id === 'success-proof');
    const failure = scenarios.find((s) => s.id === 'failure-proof');
    if (success && failure && success.id === failure.id) {
      errors.push('mutually exclusive success and failure must use independent scenarios');
    }
  }

  const coverage = Array.isArray(plan?.coverage) ? plan.coverage : [];
  for (const probe of probes) {
    const entry = coverage.find((c) => c.probeId === probe.id);
    if (!entry || !Array.isArray(entry.scenarioIds) || entry.scenarioIds.length === 0) {
      errors.push(`probe ${probe?.id || 'missing'} has no reachable scenario`);
      continue;
    }
    for (const scenarioId of entry.scenarioIds) {
      if (!ids.has(scenarioId)) errors.push(`probe ${probe.id} references missing scenario ${scenarioId}`);
    }
  }

  return { pass: errors.length === 0, errors, requiredTerminalStates };
}

export function compileProofPlan({ gdd, baseSeconds = 12, maxProofSeconds = 125 } = {}) {
  const probes = Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : [];
  const states = new Set(
    probes
      .filter((p) => p?.kind === 'state_reached')
      .map((p) => String(p?.state || ''))
  );
  const declaredSeconds = inferDeclaredSeconds(gdd);
  const terminalSeconds = Math.min(
    maxProofSeconds,
    Math.max(baseSeconds, declaredSeconds ? declaredSeconds + 5 : maxProofSeconds)
  );

  const scenarios = [
    {
      id: 'base',
      purpose: 'technical-causality-and-active-layout',
      inputMode: 'active+idle-control',
      seconds: baseSeconds,
      stopStates: [],
      restartAtEnd: false
    }
  ];
  if (states.has('success')) {
    scenarios.push({
      id: 'success-proof',
      purpose: 'prove real successful completion under deterministic active input',
      inputMode: 'active',
      seconds: terminalSeconds,
      stopStates: ['success'],
      restartAtEnd: true
    });
  }
  if (states.has('failure')) {
    scenarios.push({
      id: 'failure-proof',
      purpose: 'prove real timeout/failure independently from success',
      inputMode: 'idle',
      seconds: terminalSeconds,
      stopStates: ['failure'],
      restartAtEnd: true
    });
  }

  const scenarioIds = scenarios.map((s) => s.id);
  const coverage = probes.map((probe) => ({
    probeId: probe.id,
    ownerRequirementId: probe.ownerRequirementId,
    scenarioIds: routeProbe(probe, scenarioIds)
  }));

  const plan = {
    schemaVersion: 'proof-plan-v1',
    baseSeconds,
    maxProofSeconds,
    declaredRoundSeconds: declaredSeconds,
    scenarios,
    coverage
  };
  const validation = validateProofPlan({ gdd, plan });
  return { ...plan, pass: validation.pass, errors: validation.errors, requiredTerminalStates: validation.requiredTerminalStates };
}
