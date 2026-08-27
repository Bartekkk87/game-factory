import assert from 'node:assert/strict';
import { compileProofPlan, validateProofPlan } from './proof-plan.mjs';

const harborGdd = {
  title: 'Harbor Courier',
  mechanics: [
    { name: 'Tide-clock', description: 'A visible 75-second countdown runs during play.' }
  ],
  probePlan: {
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
assert.equal(plan.declaredRoundSeconds, 75);
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

console.log('proof reachability OK: legacy Harbor single-session proof rejected; independent success/failure/restart scenarios compiled');
