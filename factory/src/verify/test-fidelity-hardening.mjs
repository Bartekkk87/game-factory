import assert from 'node:assert/strict';
import { createOwnerContract } from '../contract/owner.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { evaluateProductFidelity } from './fidelity.mjs';

const ownerContract = createOwnerContract({
  source: 'p0-03-adversarial',
  idea: [
    '## Must-Have',
    '- A real boss encounter must enter during active gameplay.'
  ].join('\n')
});

const gdd = compileDirectorTraceability({
  title: 'Fake Event Adversarial Fixture',
  genre: 'test',
  acceptanceCriteria: [
    { ownerRequirementId: 'MH-01', statement: 'A mechanically meaningful boss enters during active play.' }
  ],
  probePlan: {
    scoreEvents: ['Space'],
    requirementProbes: [
      { ownerRequirementId: 'MH-01', kind: 'event', eventType: 'boss_entered' }
    ]
  }
}, ownerContract);

assert.equal(gdd.probePlan.requirementProbes[0].strength, 'correlated_gameplay');

// Adversarial fixture: the expected event name is emitted at init, but no gameplay
// value has changed and the event predates the early evidence point.
const fakeEventReport = {
  timeline: [
    { phase: 'start', snapshot: { state: 'title', score: 0, time: 0, events: [] } },
    {
      phase: 'early',
      snapshot: {
        state: 'playing', score: 0, time: 1.2,
        events: [{ seq: 1, type: 'boss_entered', time: 0, state: 'playing', score: 0, data: {} }]
      }
    },
    { phase: 'mid', snapshot: { state: 'playing', score: 0, time: 3, events: [] } },
    { phase: 'end', snapshot: { state: 'playing', score: 0, time: 8, events: [] } }
  ]
};
const fakeVerdict = evaluateProductFidelity({ ownerContract, gdd, report: fakeEventReport });
assert.equal(fakeVerdict.pass, false);
assert.match(fakeVerdict.failures[0].detail, /correlated gameplay evidence|too early|value change/i);
assert.deepEqual(fakeVerdict.coverage.generatedGameEventDependentRequirementIds, ['MH-01']);
assert.deepEqual(fakeVerdict.coverage.correlatedGeneratedGameEventRequirementIds, ['MH-01']);
assert.deepEqual(fakeVerdict.coverage.harnessObservedRequirementIds, []);
assert.equal(fakeVerdict.coverage.unstructuredBriefContentEvaluated, false);
assert.match(fakeVerdict.coverage.scope, /generated-game event instrumentation/i);

// Control fixture: the same event is emitted only after active deterministic play has
// progressed. Event time/state/score are captured by the engine probe extension, not
// supplied by the LLM event payload. The event identity itself remains generated-game
// instrumentation, which the coverage metadata must disclose.
const realMechanicReport = {
  timeline: [
    { phase: 'start', snapshot: { state: 'title', score: 0, time: 0, events: [] } },
    { phase: 'early', snapshot: { state: 'playing', score: 1, time: 1.2, events: [] } },
    {
      phase: 'mid',
      snapshot: {
        state: 'playing', score: 3, time: 3,
        events: [{ seq: 7, type: 'boss_entered', time: 2.5, state: 'playing', score: 2, data: {} }]
      }
    },
    { phase: 'end', snapshot: { state: 'playing', score: 5, time: 8, events: [] } }
  ]
};
const realVerdict = evaluateProductFidelity({ ownerContract, gdd, report: realMechanicReport });
assert.equal(realVerdict.pass, true);
assert.equal(realVerdict.criteria[0].strength, 'correlated_gameplay');
assert.deepEqual(realVerdict.coverage.generatedGameEventDependentRequirementIds, ['MH-01']);
assert.deepEqual(realVerdict.coverage.correlatedGeneratedGameEventRequirementIds, ['MH-01']);

const harnessContract = createOwnerContract({
  source: 'harness-observed-fixture',
  idea: '## Must-Have\n- Score must increase during play.'
});
const harnessGdd = compileDirectorTraceability({
  title: 'Harness Evidence Fixture',
  genre: 'test',
  acceptanceCriteria: [
    { ownerRequirementId: 'MH-01', statement: 'Score increases during active play.' }
  ],
  probePlan: {
    scoreEvents: ['Space'],
    requirementProbes: [
      { ownerRequirementId: 'MH-01', kind: 'score_change' }
    ]
  }
}, harnessContract);
const harnessVerdict = evaluateProductFidelity({ ownerContract: harnessContract, gdd: harnessGdd, report: realMechanicReport });
assert.equal(harnessVerdict.pass, true);
assert.deepEqual(harnessVerdict.coverage.harnessObservedRequirementIds, ['MH-01']);
assert.deepEqual(harnessVerdict.coverage.generatedGameEventDependentRequirementIds, []);

console.log('P0-03 fidelity hardening selftest: PASS');
