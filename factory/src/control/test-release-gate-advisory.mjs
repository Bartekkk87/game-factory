import assert from 'node:assert/strict';
import { evaluateReleaseGate, RELEASE_RULE } from './release-gate.mjs';

assert.equal(RELEASE_RULE, 'Technical PASS + Product Fidelity PASS + Budget PASS');

const lowExperience = evaluateReleaseGate({
  technical: { pass: true },
  productFidelity: { pass: true },
  experienceScore: 1,
  minExperience: 6.5,
  budget: { pass: true, spentUsd: 1, budgetUsd: 10 }
});
assert.equal(lowExperience.pass, true);
assert.deepEqual(lowExperience.reasons, []);
assert.equal(lowExperience.gates.experience.pass, false);
assert.equal(lowExperience.gates.experience.advisory, true);
assert.equal(lowExperience.gates.experience.authoritative, false);

const technicalFailure = evaluateReleaseGate({
  technical: { pass: false },
  productFidelity: { pass: true },
  experienceScore: 10,
  budget: { pass: true }
});
assert.equal(technicalFailure.pass, false);
assert.deepEqual(technicalFailure.reasons, ['technical_not_passed']);

const budgetFailure = evaluateReleaseGate({
  technical: { pass: true },
  productFidelity: { pass: true },
  experienceScore: 10,
  budget: { pass: false }
});
assert.equal(budgetFailure.pass, false);
assert.deepEqual(budgetFailure.reasons, ['budget_not_passed']);

console.log('release gate advisory experience selftest: PASS');
