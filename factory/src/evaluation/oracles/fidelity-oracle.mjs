import assert from 'node:assert/strict';
import { createOwnerContract, ownerIndependentReviewClaims } from '../../contract/owner.mjs';
import { compileDirectorTraceability } from '../../contract/traceability.mjs';
import { enforceIndependentFullBriefReview } from '../../roles/playtester.mjs';
import { evaluateProductFidelity } from '../../verify/fidelity.mjs';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

function eventFixture() {
  const ownerContract = createOwnerContract({ source: 'corpus-fidelity', idea: '## Must-Have\n- A real boss encounter must enter during active gameplay.' });
  const gdd = compileDirectorTraceability({
    title: 'Event Fidelity Fixture', genre: 'test',
    acceptanceCriteria: [{ ownerRequirementId: 'MH-01', statement: 'A mechanically meaningful boss enters during active play.' }],
    probePlan: { scoreEvents: ['Space'], requirementProbes: [{ ownerRequirementId: 'MH-01', kind: 'event', eventType: 'boss_entered' }] }
  }, ownerContract);
  const fakeReport = { timeline: [
    { phase: 'start', snapshot: { state: 'title', score: 0, time: 0, events: [] } },
    { phase: 'early', snapshot: { state: 'playing', score: 0, time: 1.2, events: [{ seq: 1, type: 'boss_entered', time: 0, state: 'playing', score: 0, data: {} }] } },
    { phase: 'mid', snapshot: { state: 'playing', score: 0, time: 3, events: [] } },
    { phase: 'end', snapshot: { state: 'playing', score: 0, time: 8, events: [] } }
  ] };
  const realReport = { timeline: [
    { phase: 'start', snapshot: { state: 'title', score: 0, time: 0, events: [] } },
    { phase: 'early', snapshot: { state: 'playing', score: 1, time: 1.2, events: [] } },
    { phase: 'mid', snapshot: { state: 'playing', score: 3, time: 3, events: [{ seq: 7, type: 'boss_entered', time: 2.5, state: 'playing', score: 2, data: {} }] } },
    { phase: 'end', snapshot: { state: 'playing', score: 5, time: 8, events: [] } }
  ] };
  return { ownerContract, gdd, fakeReport, realReport };
}

function fullBriefFixture() {
  const ownerContract = createOwnerContract({
    source: 'corpus-full-brief',
    idea: 'Create a compact arena game. Dark industrial atmosphere. Maybe add co-op later. The score must increase during play.'
  });
  const gdd = compileDirectorTraceability({
    title: 'Full Brief Coverage Fixture', genre: 'test',
    acceptanceCriteria: [
      { ownerRequirementId: 'MH-01', statement: 'The game is created.' },
      { ownerRequirementId: 'MH-02', statement: 'Score increases during play.' }
    ],
    probePlan: { scoreEvents: ['Space'], requirementProbes: [
      { ownerRequirementId: 'MH-01', kind: 'started_by_early' },
      { ownerRequirementId: 'MH-02', kind: 'score_change' }
    ] }
  }, ownerContract);
  return { ownerContract, gdd };
}

const caseId = caseIdFromArgs();
if (caseId === 'gp-generated-event-self-attestation-reject') {
  const { ownerContract, gdd, fakeReport } = eventFixture();
  const verdict = evaluateProductFidelity({ ownerContract, gdd, report: fakeReport });
  assert.equal(verdict.pass, false);
  assert.match(verdict.failures[0].detail, /correlated gameplay evidence|too early|value change/i);
  assert.equal(verdict.criteria[0].evidenceSource, 'generated-game-event+runtime-correlation');
} else if (caseId === 'gp-generated-event-correlated-progress-pass') {
  const { ownerContract, gdd, realReport } = eventFixture();
  const verdict = evaluateProductFidelity({ ownerContract, gdd, report: realReport });
  assert.equal(verdict.pass, true);
  assert.equal(verdict.criteria[0].strength, 'correlated_gameplay');
  assert.equal(verdict.criteria[0].evidenceSource, 'generated-game-event+runtime-correlation');
} else if (caseId === 'gp-full-brief-independent-review') {
  const { ownerContract } = fullBriefFixture();
  assert.deepEqual(ownerIndependentReviewClaims(ownerContract).map((claim) => claim.id), ['UN-01']);
  const review = enforceIndependentFullBriefReview({
    fidelityVerdict: 'PASS', missingRequirements: [], fidelityCritique: ['Dark industrial atmosphere is visible.'],
    independentClaimReviews: [{ claimId: 'UN-01', verdict: 'PASS', evidenceSources: ['screenshot'], evidenceNote: 'Gameplay visibly uses the requested dark industrial atmosphere.' }],
    scores: { visuals: 8, uiClarity: 8, funProxy: 8, performance: 10 }, overall: 8.2, critique: [], priorityFixes: []
  }, ownerContract);
  assert.equal(review.fullBriefCoverage.pass, true);
  assert.equal(review.fullBriefCoverage.evidencePolicy, 'independent-observation-required');
} else if (caseId === 'gp-full-brief-optional-claim-excluded') {
  const { ownerContract } = fullBriefFixture();
  assert.equal(ownerContract.unknowns.find((claim) => claim.id === 'UN-01').text, 'Dark industrial atmosphere.');
  assert.equal(ownerContract.unknowns.find((claim) => claim.id === 'UN-02').text, 'Maybe add co-op later.');
  assert.deepEqual(ownerIndependentReviewClaims(ownerContract).map((claim) => claim.id), ['UN-01']);
} else {
  throw new Error(`unsupported fidelity corpus case: ${caseId}`);
}

console.log(JSON.stringify({ caseId, observation: 'PASS' }));
