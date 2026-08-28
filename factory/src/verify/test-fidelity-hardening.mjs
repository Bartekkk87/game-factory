import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createOwnerContract, ownerIndependentReviewClaims } from '../contract/owner.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { enforceIndependentFullBriefReview } from '../roles/playtester.mjs';
import { evaluateProductFidelity } from './fidelity.mjs';

const ownerContract = createOwnerContract({ source: 'p0-03-adversarial', idea: '## Must-Have\n- A real boss encounter must enter during active gameplay.' });
const gdd = compileDirectorTraceability({
  title: 'Fake Event Adversarial Fixture', genre: 'test',
  acceptanceCriteria: [{ ownerRequirementId: 'MH-01', statement: 'A mechanically meaningful boss enters during active play.' }],
  probePlan: { scoreEvents: ['Space'], requirementProbes: [{ ownerRequirementId: 'MH-01', kind: 'event', eventType: 'boss_entered' }] }
}, ownerContract);
assert.equal(gdd.probePlan.requirementProbes[0].strength, 'correlated_gameplay');

const fakeEventReport = { timeline: [
  { phase: 'start', snapshot: { state: 'title', score: 0, time: 0, events: [] } },
  { phase: 'early', snapshot: { state: 'playing', score: 0, time: 1.2, events: [{ seq: 1, type: 'boss_entered', time: 0, state: 'playing', score: 0, data: {} }] } },
  { phase: 'mid', snapshot: { state: 'playing', score: 0, time: 3, events: [] } },
  { phase: 'end', snapshot: { state: 'playing', score: 0, time: 8, events: [] } }
] };
const fakeVerdict = evaluateProductFidelity({ ownerContract, gdd, report: fakeEventReport });
assert.equal(fakeVerdict.pass, false);
assert.match(fakeVerdict.failures[0].detail, /correlated gameplay evidence|too early|value change/i);
assert.equal(fakeVerdict.criteria[0].evidenceSource, 'generated-game-event+runtime-correlation');
assert.deepEqual(fakeVerdict.coverage.generatedGameEventDependentRequirementIds, ['MH-01']);
assert.deepEqual(fakeVerdict.coverage.correlatedGeneratedGameEventRequirementIds, ['MH-01']);
assert.deepEqual(fakeVerdict.coverage.harnessObservedRequirementIds, []);
assert.equal(fakeVerdict.coverage.unstructuredBriefContentEvaluated, true);

const realMechanicReport = { timeline: [
  { phase: 'start', snapshot: { state: 'title', score: 0, time: 0, events: [] } },
  { phase: 'early', snapshot: { state: 'playing', score: 1, time: 1.2, events: [] } },
  { phase: 'mid', snapshot: { state: 'playing', score: 3, time: 3, events: [{ seq: 7, type: 'boss_entered', time: 2.5, state: 'playing', score: 2, data: {} }] } },
  { phase: 'end', snapshot: { state: 'playing', score: 5, time: 8, events: [] } }
] };
const realVerdict = evaluateProductFidelity({ ownerContract, gdd, report: realMechanicReport });
assert.equal(realVerdict.pass, true);
assert.equal(realVerdict.criteria[0].strength, 'correlated_gameplay');
assert.equal(realVerdict.criteria[0].evidenceSource, 'generated-game-event+runtime-correlation');

const harnessContract = createOwnerContract({ source: 'harness-observed-fixture', idea: '## Must-Have\n- Score must increase during play.' });
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

const terminalContract = createOwnerContract({ source: 'terminal-state-alias-fixture', idea: '## Must-Have\n- A failed run must reach a clear failure state.\n- A completed run must reach a clear success state.' });
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

// Package 4 / D-3: concrete descriptive claims are routed to mandatory independent review;
// ambiguous optional language remains non-binding.
const fullBriefContract = createOwnerContract({
  source: 'package-4-d3-repair',
  idea: 'Create a compact arena game. Dark industrial atmosphere. Maybe add co-op later. The score must increase during play.'
});
const fullBriefGdd = compileDirectorTraceability({
  title: 'Full Brief Coverage Fixture', genre: 'test',
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
assert.deepEqual(ownerIndependentReviewClaims(fullBriefContract).map((claim) => claim.id), ['UN-01']);
assert.equal(fullBriefContract.unknowns.find((claim) => claim.id === 'UN-01').text, 'Dark industrial atmosphere.');
assert.equal(fullBriefContract.unknowns.find((claim) => claim.id === 'UN-02').text, 'Maybe add co-op later.');
assert.deepEqual(fullBriefVerdict.coverage.independentReviewClaimIds, ['UN-01']);
assert.deepEqual(fullBriefVerdict.coverage.ambiguousUnknownClaimIdsExcluded, ['UN-02']);
assert.equal(fullBriefVerdict.coverage.independentReviewRequired, true);
assert.equal(fullBriefVerdict.coverage.unstructuredBriefContentEvaluated, true);
assert.match(fullBriefVerdict.coverage.scope, /mandatory independent screenshot\/experience review/i);

const reviewPass = enforceIndependentFullBriefReview({
  fidelityVerdict: 'PASS', missingRequirements: [], fidelityCritique: ['Dark industrial atmosphere is visible.'],
  independentClaimReviews: [{
    claimId: 'UN-01', verdict: 'PASS', evidenceSources: ['screenshot'],
    evidenceNote: 'Captured gameplay visibly uses a dark industrial palette and machinery-like geometry.'
  }],
  scores: { visuals: 8, uiClarity: 8, funProxy: 8, performance: 10 }, overall: 8.2, critique: [], priorityFixes: []
}, fullBriefContract);
assert.equal(reviewPass.fullBriefCoverage.pass, true);
assert.deepEqual(reviewPass.fullBriefCoverage.independentReviewClaimIds, ['UN-01']);
assert.equal(reviewPass.fullBriefCoverage.evidencePolicy, 'independent-observation-required');

assert.throws(() => enforceIndependentFullBriefReview({
  fidelityVerdict: 'FAIL', missingRequirements: ['UN-01'], fidelityCritique: ['Atmosphere is not recognizable.'],
  independentClaimReviews: [{
    claimId: 'UN-01', verdict: 'FAIL', evidenceSources: ['screenshot'],
    evidenceNote: 'Captured gameplay is bright/default and does not show the requested industrial atmosphere.'
  }],
  scores: { visuals: 7, uiClarity: 8, funProxy: 8, performance: 10 }, overall: 7.8, critique: [], priorityFixes: []
}, fullBriefContract), (error) => error?.code === 'FULL_BRIEF_FIDELITY_FAILED' && error?.failedClaimIds?.[0] === 'UN-01');

const pipelineSource = fs.readFileSync(new URL('../pipeline/run.mjs', import.meta.url), 'utf8');
const playtesterSource = fs.readFileSync(new URL('../roles/playtester.mjs', import.meta.url), 'utf8');
assert.match(pipelineSource, /return failClosed\(runDir, state, llmFailureReason\(e, 'playtester_failed'\)/);
assert.match(playtesterSource, /FULL_BRIEF_FIDELITY_FAILED/);
assert.match(playtesterSource, /ownerIndependentReviewClaims/);

console.log('PACKAGE 4 D-3 PASS: deterministic MH/NG evidence plus mandatory independent review covers concrete full-brief claims; ambiguous optional claims stay non-binding; failed review is fail-closed.');
console.log('P0-03 fidelity hardening selftest: PASS');
