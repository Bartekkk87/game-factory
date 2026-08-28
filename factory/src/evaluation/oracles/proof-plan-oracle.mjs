import assert from 'node:assert/strict';
import { compileProofPlan, validateProofPlan } from '../../verify/proof-plan.mjs';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

function harborGdd() {
  return {
    title: 'Harbor Courier',
    mechanics: [{ name: 'Tide-clock', description: 'A visible 75-second countdown runs during play.' }],
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
}

function legacySingleSession(gdd) {
  return {
    scenarios: [{ id: 'base', inputMode: 'active+idle-control', seconds: 12, stopStates: [] }],
    coverage: gdd.probePlan.requirementProbes.map((probe) => ({ probeId: probe.id, scenarioIds: ['base'] }))
  };
}

const caseId = caseIdFromArgs();
const gdd = harborGdd();
if (caseId === 'gp-proof-plan-terminal-reachability') {
  const legacy = validateProofPlan({ gdd, plan: legacySingleSession(gdd) });
  assert.equal(legacy.pass, false);
  assert(legacy.errors.some((error) => error.includes('success-proof')));
  assert(legacy.errors.some((error) => error.includes('failure-proof')));
  const plan = compileProofPlan({ gdd, baseSeconds: 12, maxProofSeconds: 125 });
  assert.equal(plan.pass, true);
  assert(plan.scenarios.some((scenario) => scenario.id === 'success-proof'));
  assert(plan.scenarios.some((scenario) => scenario.id === 'failure-proof'));
} else if (caseId === 'gp-proof-plan-restart-coverage') {
  const plan = compileProofPlan({ gdd, baseSeconds: 12, maxProofSeconds: 125 });
  assert.equal(plan.pass, true);
  const restart = plan.coverage.find((entry) => entry.probeId === 'PR-MH-07');
  assert.deepEqual(restart.scenarioIds, ['success-proof', 'failure-proof']);
  assert.equal(plan.scenarios.find((scenario) => scenario.id === 'success-proof')?.restartAtEnd, true);
  assert.equal(plan.scenarios.find((scenario) => scenario.id === 'failure-proof')?.restartAtEnd, true);
} else if (caseId === 'gp-terminal-alias-fidelity') {
  const aliasGdd = structuredClone(gdd);
  aliasGdd.probePlan.requirementProbes.find((probe) => probe.id === 'PR-MH-04').state = 'failed';
  aliasGdd.probePlan.requirementProbes.find((probe) => probe.id === 'PR-MH-06').state = 'won';
  const plan = compileProofPlan({ gdd: aliasGdd, baseSeconds: 12, maxProofSeconds: 125 });
  assert.equal(plan.pass, true);
  assert.deepEqual(plan.requiredTerminalStates.sort(), ['failure', 'success']);
  assert.deepEqual(plan.coverage.find((entry) => entry.probeId === 'PR-MH-04').scenarioIds, ['failure-proof']);
  assert.deepEqual(plan.coverage.find((entry) => entry.probeId === 'PR-MH-06').scenarioIds, ['success-proof']);
} else if (caseId === 'gp-terminal-unknown-dead-reject') {
  const unknown = structuredClone(gdd);
  unknown.probePlan.requirementProbes.find((probe) => probe.id === 'PR-MH-04').state = 'dead';
  const plan = compileProofPlan({ gdd: unknown, baseSeconds: 12, maxProofSeconds: 125 });
  assert.equal(plan.pass, false);
  assert(plan.errors.some((error) => /unsupported verifier state dead/i.test(error)));
} else if (caseId === 'hr-harbor-proof-plan-unreachability') {
  const legacy = validateProofPlan({ gdd, plan: legacySingleSession(gdd) });
  assert.equal(legacy.pass, false, 'historical Harbor single-session proof must remain rejected');
  assert(legacy.errors.some((error) => error.includes('restart_after_terminal')));
  const repaired = compileProofPlan({ gdd, baseSeconds: 12, maxProofSeconds: 125 });
  assert.equal(repaired.pass, true);
  assert.deepEqual(repaired.coverage.find((entry) => entry.probeId === 'PR-MH-07').scenarioIds, ['success-proof', 'failure-proof']);
} else {
  throw new Error(`unsupported proof-plan corpus case: ${caseId}`);
}

console.log(JSON.stringify({ caseId, observation: 'PASS' }));
