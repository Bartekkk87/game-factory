import { canonicalTerminalState, canonicalVerifierState } from './state-semantics.mjs';
import { verifierActionContract } from './action-policy.mjs';

function declaredRoundSeconds(gdd) {
  const raw = gdd?.probePlan?.roundSeconds;
  if (raw === undefined || raw === null) return { value: null, error: null };
  if (!Number.isInteger(raw) || raw < 5 || raw > 120) {
    return { value: null, error: 'probePlan.roundSeconds must be an integer from 5 to 120' };
  }
  return { value: raw, error: null };
}

function routeProbe(probe, scenarioIds) {
  const kind = String(probe?.kind || '');
  const terminalState = canonicalTerminalState(probe?.state);
  if (kind === 'state_reached' && terminalState === 'success') return ['success-proof'];
  if (kind === 'state_reached' && terminalState === 'failure') return ['failure-proof'];
  if (kind === 'restart_after_terminal') return scenarioIds.filter((id) => id === 'success-proof' || id === 'failure-proof');
  if (kind === 'event_absent') return [...scenarioIds];
  if (kind === 'layout_no_overlap' || kind === 'started_by_early' || kind === 'score_change') return ['base'];
  if (kind === 'event' || kind === 'event_value_change') return scenarioIds.includes('success-proof') ? ['base', 'success-proof'] : ['base'];
  return ['base'];
}

export function validateProofPlan({ gdd, plan } = {}) {
  const probes = Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : [];
  const scenarios = Array.isArray(plan?.scenarios) ? plan.scenarios : [];
  const ids = new Set(scenarios.map((scenario) => scenario.id));
  const errors = [];

  if (!ids.has('base')) errors.push('base scenario missing');
  const timing = declaredRoundSeconds(gdd);
  if (timing.error) errors.push(timing.error);
  if (plan?.declaredRoundSeconds !== timing.value) errors.push('proof plan declaredRoundSeconds does not match typed probePlan.roundSeconds');

  const stateProbes = probes.filter((probe) => probe?.kind === 'state_reached');
  for (const probe of stateProbes) {
    const declared = String(probe?.state ?? '').trim();
    if (!canonicalVerifierState(declared)) errors.push(`probe ${probe?.id || 'missing'} uses unsupported verifier state ${declared || 'missing'}`);
  }

  const requiredTerminalStates = [...new Set(stateProbes.map((probe) => canonicalTerminalState(probe?.state)).filter(Boolean))];
  for (const state of requiredTerminalStates) {
    const expectedId = `${state}-proof`;
    const scenario = scenarios.find((item) => item.id === expectedId);
    if (!scenario) {
      errors.push(`${expectedId} scenario missing for required terminal state ${state}`);
      continue;
    }
    const stopStates = Array.isArray(scenario.stopStates)
      ? scenario.stopStates.map((value) => canonicalVerifierState(value)).filter(Boolean)
      : [];
    if (!stopStates.includes(state)) errors.push(`${expectedId} does not observe terminal state ${state}`);
    if (!Number.isFinite(Number(scenario.seconds)) || Number(scenario.seconds) <= 0) errors.push(`${expectedId} has invalid observation window`);
  }

  if (requiredTerminalStates.includes('success') && requiredTerminalStates.includes('failure')) {
    const success = scenarios.find((scenario) => scenario.id === 'success-proof');
    const failure = scenarios.find((scenario) => scenario.id === 'failure-proof');
    if (success && failure && success.id === failure.id) errors.push('mutually exclusive success and failure must use independent scenarios');
  }

  const restartProbe = probes.find((probe) => probe?.kind === 'restart_after_terminal');
  if (restartProbe) {
    const terminalIds = ['success-proof', 'failure-proof'].filter((id) => ids.has(id));
    if (!terminalIds.length) errors.push('restart_after_terminal requires at least one terminal proof scenario');
    for (const id of terminalIds) {
      const scenario = scenarios.find((item) => item.id === id);
      if (scenario?.restartAtEnd !== true) errors.push(`${id} must attempt restart for restart_after_terminal proof`);
    }
  }

  const coverage = Array.isArray(plan?.coverage) ? plan.coverage : [];
  for (const probe of probes) {
    const entry = coverage.find((item) => item.probeId === probe.id);
    if (!entry || !Array.isArray(entry.scenarioIds) || entry.scenarioIds.length === 0) {
      errors.push(`probe ${probe?.id || 'missing'} has no reachable scenario`);
      continue;
    }
    for (const scenarioId of entry.scenarioIds) if (!ids.has(scenarioId)) errors.push(`probe ${probe.id} references missing scenario ${scenarioId}`);
  }

  return { pass: errors.length === 0, errors, requiredTerminalStates };
}

export function compileProofPlan({ gdd, baseSeconds = 12, maxProofSeconds = 125 } = {}) {
  const probes = Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : [];
  const states = new Set(
    probes.filter((probe) => probe?.kind === 'state_reached').map((probe) => canonicalTerminalState(probe?.state)).filter(Boolean)
  );
  const timing = declaredRoundSeconds(gdd);
  const terminalSeconds = Math.min(
    maxProofSeconds,
    Math.max(baseSeconds, timing.value === null ? maxProofSeconds : timing.value + 5)
  );

  const scenarios = [{
    id: 'base',
    purpose: 'technical-causality-and-active-layout',
    inputMode: 'active+idle-control',
    seconds: baseSeconds,
    stopStates: [],
    restartAtEnd: false
  }];
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

  const scenarioIds = scenarios.map((scenario) => scenario.id);
  const coverage = probes.map((probe) => ({
    probeId: probe.id,
    ownerRequirementId: probe.ownerRequirementId,
    scenarioIds: routeProbe(probe, scenarioIds)
  }));

  const plan = {
    schemaVersion: 'proof-plan-v2',
    baseSeconds,
    maxProofSeconds,
    declaredRoundSeconds: timing.value,
    timingSource: timing.value === null ? 'safe-max-fallback' : 'typed-probePlan.roundSeconds',
    actionPolicy: verifierActionContract(),
    scenarios,
    coverage
  };
  const validation = validateProofPlan({ gdd, plan });
  return {
    ...plan,
    pass: validation.pass,
    errors: validation.errors,
    requiredTerminalStates: validation.requiredTerminalStates
  };
}
