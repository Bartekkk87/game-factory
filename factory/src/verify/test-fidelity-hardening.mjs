import assert from 'node:assert/strict';
import fs from 'node:fs';
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
assert.equal(fakeVerdict.criteria[0].evidenceSource, 'generated-game-event+runtime-correlation');
assert.deepEqual(fakeVerdict.coverage.generatedGameEventDependentRequirementIds, ['MH-01']);
assert.deepEqual(fakeVerdict.coverage.correlatedGeneratedGameEventRequirementIds, ['MH-01']);
assert.deepEqual(fakeVerdict.coverage.harnessObservedRequirementIds, []);
assert.equal(fakeVerdict.coverage.unstructuredBriefContentEvaluated, false);
assert.match(fakeVerdict.coverage.scope, /generated-game event instrumentation/i);

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
assert.equal(realVerdict.criteria[0].evidenceSource, 'generated-game-event+runtime-correlation');
assert.deepEqual(realVerdict.coverage.generatedGameEventDependentRequirementIds, ['MH-01']);
assert.deepEqual(realVerdict.coverage.correlatedGeneratedGameEventRequirementIds, ['MH-01']);

const harnessContract = createOwnerContract({
  source: 'harness-observed-fixture',
  idea: '## Must-Have\n- Score must increase during play.'
});
const harnessGdd = compileDirectorTraceability({
  title: 'Harness Evidence Fixture', genre: 'test',
  acceptanceCriteria: [{ ownerRequirementId: 'MH-01', statement: 'Score increases during active play.' }],
  probePlan: { scoreEvents: ['Space'], requirementProbes: [{ ownerRequirementId: 'MH-01', kind: 'score_change' }] }
}, harnessContract);
const harnessVerdict = evaluateProductFidelity({ ownerContract: harnessContract, gdd: harnessGdd, report: realMechanicReport });
assert.equal(harnessVerdict.pass, true);
assert.equal(harnessVerdict.criteria[0].evidenceSource, 'harness-observed');
assert.deepEqual(harnessVerdict.coverage.harnessObservedRequirementIds, ['MH-01']);
assert.deepEqual(harnessVerdict.coverage.generatedGameEventDependentRequirementIds, []);

const terminalContract = createOwnerContract({
  source: 'terminal-state-alias-fixture',
  idea: ['## Must-Have','- A failed run must reach a clear failure state.','- A completed run must reach a clear success state.'].join('\n')
});
const terminalGdd = compileDirectorTraceability({
  title: 'Terminal Alias Fixture', genre: 'test',
  acceptanceCriteria: [
    { ownerRequirementId: 'MH-01', statement: 'A failed run reaches failure.' },
    { ownerRequirementId: 'MH-02', statement: 'A completed run reaches success.' }
  ],
  probePlan: { scoreEvents: ['Space'], requirementProbes: [
    { ownerRequirementId: 'MH-01', kind: 'state_reached', state: 'failed' },
    { ownerRequirementId: 'MH-02', kind: 'state_reached', state: 'success' }
  ] }
}, terminalContract);
const terminalReport = { timeline: [
  { phase: 'failure-proof:terminal', scenarioId: 'failure-proof', snapshot: { state: 'gameover', score: 0, time: 5, events: [] } },
  { phase: 'success-proof:terminal', scenarioId: 'success-proof', snapshot: { state: 'won', score: 10, time: 4, events: [] } }
] };
const terminalVerdict = evaluateProductFidelity({ ownerContract: terminalContract, gdd: terminalGdd, report: terminalReport });
assert.equal(terminalVerdict.pass, true);
assert.match(terminalVerdict.criteria.find((c) => c.requirementId === 'MH-01').detail, /state failure reached.*gameover/i);
assert.match(terminalVerdict.criteria.find((c) => c.requirementId === 'MH-02').detail, /state success reached.*won/i);

const pipelineSource = fs.readFileSync(new URL('../pipeline/run.mjs', import.meta.url), 'utf8');
assert.match(pipelineSource, /coverage:\s*verified\.fidelity\.coverage/);
assert.match(pipelineSource, /Product fidelity scope/);
assert.match(pipelineSource, /coverage:\s*tech\.fidelity\.coverage/);

// Package 4 / D-3 baseline: a concrete descriptive owner claim is preserved as
// UN-01 but has no deterministic or independent authoritative coverage path.
const fullBriefContract = createOwnerContract({
  source: 'package-4-d3-baseline',
  idea: 'Create a compact arena game. Dark industrial atmosphere. The score must increase during play.'
});
const fullBriefGdd = compileDirectorTraceability({
  title: 'Full Brief Gap Fixture', genre: 'test',
  acceptanceCriteria: [
    { ownerRequirementId: 'MH-01', statement: 'The game is created.' },
    { ownerRequirementId: 'MH-02', statement: 'Score increases during play.' }
  ],
  probePlan: { scoreEvents: ['Space'], requirementProbes: [
    { ownerRequirementId: 'MH-01', kind: 'started_by_early' },
    { ownerRequirementId: 'MH-02', kind: 'score_change' }
  ] }
}, fullBriefContract);
const fullBriefVerdict = evaluateProductFidelity({ ownerContract: fullBriefContract, gdd: fullBriefGdd, report: realMechanicReport });
assert.equal(fullBriefContract.unknowns[0].text, 'Dark industrial atmosphere.');
assert.equal(fullBriefVerdict.coverage.unstructuredBriefContentEvaluated, false);
assert.equal(fullBriefVerdict.coverage.evaluatedRequirementIds.includes('UN-01'), false);
assert.match(pipelineSource, /Playtester fidelity \(advisory\)/);
console.log('PACKAGE 4 BASELINE REPRODUCED: D-3 descriptive Owner claim UN-01 is preserved but excluded from Product Fidelity, while Playtester fidelity remains advisory.');
console.log('P0-03 fidelity hardening selftest: PASS');
