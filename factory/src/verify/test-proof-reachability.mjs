import assert from 'node:assert/strict';
import { compileProofPlan, validateProofPlan } from './proof-plan.mjs';

const harborGdd = {
  title: 'Harbor Courier',
  mechanics: [
    { name: 'Tide-clock', description: 'Flavor text mentions a 99-second dramatic window, but verifier timing must not be inferred from prose.' }
  ],
  probePlan: {
    roundSeconds: 75,
    requirementProbes: [
      { id: 'PR-MH-02', ownerRequirementId: 'MH-02', kind: 'event', eventType: 'third_delivery_completed' },
      { id: 'PR-MH-03', ownerRequirementId: 'MH-03', kind: 'event', eventType: 'route_detour_completed' },
      { id: 'PR-MH-04', ownerRequirementId: 'MH-04', kind: 'state_reached', state: 'failure' },
      { id: 'PR-MH-06', ownerRequirementId: 'MH-06', kind: 'state_reached', state: 'success' },
      { id: 'PR-MH-07', ownerRequirementId: 'MH-07', kind: 'restart_after_terminal', legacyEventType: 'fresh_run_started' }
    ]
  }
};

const legacySingleSession = {
  scenarios: [
    { id: 'base', inputMode: 'active+idle-control', seconds: 12, stopStates: [] }
  ],
  coverage: harborGdd.probePlan.requirementProbes.map((probe) => ({
    probeId: probe.id,
    scenarioIds: ['base']
  }))
};

const legacy = validateProofPlan({ gdd: harborGdd, plan: legacySingleSession });
assert.equal(legacy.pass, false, 'legacy 12-second single-session Harbor proof must be rejected');
assert(legacy.errors.some((e) => e.includes('success-proof')));
assert(legacy.errors.some((e) => e.includes('failure-proof')));
assert(legacy.errors.some((e) => e.includes('restart_after_terminal')));

const plan = compileProofPlan({ gdd: harborGdd, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(plan.pass, true);
assert.equal(plan.declaredRoundSeconds, 75, 'typed probePlan.roundSeconds is authoritative');
const success = plan.scenarios.find((s) => s.id === 'success-proof');
const failure = plan.scenarios.find((s) => s.id === 'failure-proof');
assert(success && failure, 'success and failure require independent scenarios');
assert.equal(success.inputMode, 'active');
assert.equal(failure.inputMode, 'idle');
assert.equal(success.seconds, 80);
assert.equal(failure.seconds, 80);
assert.deepEqual(success.stopStates, ['success']);
assert.deepEqual(failure.stopStates, ['failure']);
assert.equal(success.restartAtEnd, true);
assert.equal(failure.restartAtEnd, true);

const successCoverage = plan.coverage.find((c) => c.probeId === 'PR-MH-06');
const failureCoverage = plan.coverage.find((c) => c.probeId === 'PR-MH-04');
const restartCoverage = plan.coverage.find((c) => c.probeId === 'PR-MH-07');
assert.deepEqual(successCoverage.scenarioIds, ['success-proof']);
assert.deepEqual(failureCoverage.scenarioIds, ['failure-proof']);
assert.deepEqual(restartCoverage.scenarioIds, ['success-proof', 'failure-proof']);

const missingTypedTiming = structuredClone(harborGdd);
delete missingTypedTiming.probePlan.roundSeconds;
const missingTimingPlan = compileProofPlan({ gdd: missingTypedTiming, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(missingTimingPlan.declaredRoundSeconds, null, 'prose timing must never be parsed as verifier authority');
assert.equal(missingTimingPlan.scenarios.find((s) => s.id === 'success-proof').seconds, 125);

const harborAliasGdd = structuredClone(harborGdd);
harborAliasGdd.probePlan.requirementProbes.find((p) => p.id === 'PR-MH-04').state = 'failed';
harborAliasGdd.probePlan.requirementProbes.find((p) => p.id === 'PR-MH-06').state = 'won';
const aliasPlan = compileProofPlan({ gdd: harborAliasGdd, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(aliasPlan.pass, true, 'Director aliases failed/won must compile to canonical terminal scenarios');
assert.deepEqual(aliasPlan.requiredTerminalStates.sort(), ['failure', 'success']);
assert(aliasPlan.scenarios.some((s) => s.id === 'failure-proof'));
assert(aliasPlan.scenarios.some((s) => s.id === 'success-proof'));
assert.deepEqual(aliasPlan.coverage.find((c) => c.probeId === 'PR-MH-04').scenarioIds, ['failure-proof']);
assert.deepEqual(aliasPlan.coverage.find((c) => c.probeId === 'PR-MH-06').scenarioIds, ['success-proof']);

const engineAliasGdd = structuredClone(harborGdd);
engineAliasGdd.probePlan.requirementProbes.find((p) => p.id === 'PR-MH-04').state = 'gameover';
const engineAliasPlan = compileProofPlan({ gdd: engineAliasGdd, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(engineAliasPlan.pass, true, 'engine gameover alias must map to canonical failure proof');
assert.deepEqual(engineAliasPlan.coverage.find((c) => c.probeId === 'PR-MH-04').scenarioIds, ['failure-proof']);

const unknownStateGdd = structuredClone(harborGdd);
unknownStateGdd.probePlan.requirementProbes.find((p) => p.id === 'PR-MH-04').state = 'dead';
const unknownStatePlan = compileProofPlan({ gdd: unknownStateGdd, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(unknownStatePlan.pass, false, 'unknown verifier states must fail closed before Engineer spend');
assert(unknownStatePlan.errors.some((e) => /unsupported verifier state dead/i.test(e)));

const impossibleValueChangeGdd = structuredClone(harborGdd);
impossibleValueChangeGdd.probePlan.requirementProbes.push({
  id: 'PR-MH-01', ownerRequirementId: 'MH-01', kind: 'event_value_change', eventType: 'player_moved', beforeField: 'playerX', afterField: 'playerX'
});
const impossibleValueChangePlan = compileProofPlan({ gdd: impossibleValueChangeGdd, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(impossibleValueChangePlan.pass, false, 'same-field event_value_change must be rejected before Engineer spend');
assert(impossibleValueChangePlan.errors.some((e) => /PR-MH-01 event_value_change is unsatisfiable.*playerX/i.test(e)));

const missingValueChangeFieldsGdd = structuredClone(harborGdd);
missingValueChangeFieldsGdd.probePlan.requirementProbes.push({
  id: 'PR-MH-08', ownerRequirementId: 'MH-08', kind: 'event_value_change', eventType: 'pressure_escalated'
});
const missingValueChangeFieldsPlan = compileProofPlan({ gdd: missingValueChangeFieldsGdd, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(missingValueChangeFieldsPlan.pass, false, 'event_value_change without explicit before/after fields must fail closed');
assert(missingValueChangeFieldsPlan.errors.some((e) => /PR-MH-08 event_value_change requires distinct beforeField and afterField/i.test(e)));

const validValueChangeGdd = structuredClone(harborGdd);
validValueChangeGdd.probePlan.requirementProbes.push({
  id: 'PR-MH-09', ownerRequirementId: 'MH-09', kind: 'event_value_change', eventType: 'pressure_escalated', beforeField: 'hazardSpeedBefore', afterField: 'hazardSpeedAfter'
});
const validValueChangePlan = compileProofPlan({ gdd: validValueChangeGdd, baseSeconds: 12, maxProofSeconds: 125 });
assert.equal(validValueChangePlan.pass, true, 'distinct value-change fields remain valid');

console.log('proof reachability OK: typed timing authoritative, terminal scenarios independent, unknown states and unsatisfiable value-change probes fail closed before Engineer spend');
