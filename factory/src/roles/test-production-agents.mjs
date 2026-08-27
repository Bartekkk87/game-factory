import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createOwnerContract, ownerRequirementIds } from '../contract/owner.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { evaluateProductFidelity } from '../verify/fidelity.mjs';
import { evaluateReleaseGate } from '../control/release-gate.mjs';
import { assembleSystemPrompt } from '../util/skills.mjs';
import { lessonsFor } from '../memory/store.mjs';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const engineerPrompt = read('factory/prompts/engineer.md');
const directingSkill = read('skills/directing.md');
const engineeringSkill = read('skills/engineering.md');
const engineerSource = read('factory/src/roles/engineer.mjs');
const directorSource = read('factory/src/roles/director.mjs');
const playtesterPrompt = read('factory/prompts/playtester.md');
const playtesterSource = read('factory/src/roles/playtester.mjs');
const auditorPrompt = read('factory/prompts/auditor.md');
const auditorSource = read('factory/src/roles/auditor.mjs');
const pipelineSource = read('factory/src/pipeline/run.mjs');
const routerTestSource = read('factory/src/llm/test-router.mjs');

const staleVerifierGuidance = /random\s+(?:key\s+)?mash|random\s+input|~\s*15\s*seconds|within\s+15\s+seconds/i;
for (const [label, text] of [
  ['engineer prompt', engineerPrompt],
  ['directing skill', directingSkill],
  ['engineering skill', engineeringSkill]
]) {
  assert.doesNotMatch(text, staleVerifierGuidance, `${label} contains stale verifier guidance`);
}
assert.match(directingSkill, /fixed deterministic keyboard\/pointer input sequence/i);
assert.match(directingSkill, /start -> early -> mid -> end/i);
assert.match(engineeringSkill, /fixed deterministic keyboard\/pointer input sequence/i);
assert.match(engineeringSkill, /start -> early -> mid -> end/i);

// P0-02: exercise the exact runtime assembler used by Director and Engineer.
assert.match(directorSource, /assembleSystemPrompt/);
assert.match(engineerSource, /assembleSystemPrompt/);
const assembledDirector = assembleSystemPrompt({
  promptName: 'director',
  skillName: 'directing',
  lessons: lessonsFor('director')
});
const assembledEngineer = assembleSystemPrompt({
  promptName: 'engineer',
  skillName: 'engineering',
  lessons: lessonsFor('engineer')
});
for (const [label, text] of [
  ['assembled director system prompt', assembledDirector],
  ['assembled engineer system prompt', assembledEngineer]
]) {
  assert.doesNotMatch(text, staleVerifierGuidance, `${label} contains stale verifier guidance`);
  assert.match(text, /## Learned skill directives/);
}
assert.match(assembledDirector, /fixed deterministic keyboard\/pointer input sequence/i);
assert.match(assembledEngineer, /FIXED deterministic RNG seed/);
assert.match(assembledEngineer, /fixed deterministic keyboard\/pointer input sequence/i);

const lessonSentinel = '- P0-02-ASSEMBLED-LESSON-SENTINEL';
const assembledWithLesson = assembleSystemPrompt({
  promptName: 'engineer',
  skillName: 'engineering',
  lessons: [lessonSentinel]
});
assert.match(assembledWithLesson, /## Lessons from past post-mortems/);
assert.match(assembledWithLesson, /P0-02-ASSEMBLED-LESSON-SENTINEL/);

assert.match(engineerPrompt, /FIXED deterministic RNG seed/);
assert.match(engineerPrompt, /start -> early -> mid -> end/);
assert.match(engineerPrompt, /game\.event\(type, data\)/);
assert.match(engineerSource, /Engineer requires immutable Owner Contract/);
assert.match(engineerSource, /ACCEPTANCE \+ PROBE TRACEABILITY/);
for (const operation of ['buildGame', 'rebuildGame', 'repairGame', 'polishGame']) {
  assert.match(engineerSource, new RegExp(`export async function ${operation}\\([^)]*ownerContract`, 's'));
}

assert.match(playtesterPrompt, /fidelityVerdict/);
assert.match(playtesterPrompt, /missingRequirements/);
assert.match(playtesterPrompt, /machine authority/i);
for (const token of ['ownerContract', 'gdd', 'telemetry', 'runtimeEvents', 'deterministicProductFidelity']) {
  assert.match(playtesterSource, new RegExp(token));
}
assert.match(pipelineSource, /playtesterFidelity: state\.experience\.fidelityReview/);

assert.match(auditorPrompt, /STRICTLY ADVISORY/);
assert.match(auditorPrompt, /MUST NOT issue PASS\/FAIL/);
assert.match(auditorSource, /audit\.assessment/);
assert.match(auditorSource, /if \('verdict' in audit\) delete audit\.verdict;/);
assert.match(pipelineSource, /const finalRelease = releaseFor\(state\)/);
assert.match(pipelineSource, /if \(!finalRelease\.pass\)/);
assert.doesNotMatch(pipelineSource, /evaluateReleaseGate\([^)]*audit/s);

for (const operation of ['build', 'repair', 'rebuild', 'polish']) {
  assert.match(routerTestSource, new RegExp(`['\"]${operation}['\"]`));
}
assert.match(routerTestSource, /gpt-5\.6-terra/);
assert.match(routerTestSource, /gpt-5\.6-luna/);

const ownerContract = createOwnerContract({
  source: 'l4-selftest',
  idea: [
    '## Must-Have',
    '- Productive player input increases score.',
    '## No-Go',
    '- Never emit the forbidden_explosion mechanic event.'
  ].join('\n')
});
assert.equal(ownerContract.immutable, true);
assert.deepEqual(ownerRequirementIds(ownerContract), ['MH-01', 'NG-01']);

const gdd = compileDirectorTraceability({
  title: 'L4 Integrity Fixture',
  genre: 'test',
  acceptanceCriteria: [
    { ownerRequirementId: 'MH-01', statement: 'Score increases during productive play.' },
    { ownerRequirementId: 'NG-01', statement: 'Forbidden explosion event remains absent.' }
  ],
  probePlan: {
    scoreEvents: ['Space'],
    requirementProbes: [
      { ownerRequirementId: 'MH-01', kind: 'score_change' },
      { ownerRequirementId: 'NG-01', kind: 'event_absent', eventType: 'forbidden_explosion' }
    ]
  }
}, ownerContract);

assert.equal(gdd.acceptanceCriteria[0].id, 'AC-MH-01');
assert.equal(gdd.probePlan.requirementProbes[0].id, 'PR-MH-01');
assert.equal(gdd.acceptanceCriteria[1].id, 'AC-NG-01');
assert.equal(gdd.probePlan.requirementProbes[1].id, 'PR-NG-01');

const report = {
  timeline: [
    { phase: 'start', snapshot: { state: 'title', score: 0, events: [] } },
    { phase: 'early', snapshot: { state: 'playing', score: 1, events: [{ seq: 1, type: 'score', time: 1, data: { before: 0, after: 1 } }] } },
    { phase: 'mid', snapshot: { state: 'playing', score: 2, events: [] } },
    { phase: 'end', snapshot: { state: 'playing', score: 3, events: [] } }
  ]
};
const fidelity = evaluateProductFidelity({ ownerContract, gdd, report });
assert.equal(fidelity.pass, true);
assert.equal(fidelity.criteria.every((criterion) => criterion.traceable && criterion.pass), true);

const releaseInput = {
  technical: { pass: true },
  productFidelity: fidelity,
  experienceScore: 7.2,
  budget: { pass: true, spentUsd: 0.25, budgetUsd: 1 },
  minExperience: 6.5
};
const release = evaluateReleaseGate(releaseInput);
assert.equal(release.pass, true);
assert.deepEqual(release.reasons, []);

// P0-04: advisory LLM opinions are structurally outside the release-gate API.
assert.throws(
  () => evaluateReleaseGate({ ...releaseInput, audit: { assessment: 'CONCERNS' } }),
  /non-authoritative input: audit/
);
assert.throws(
  () => evaluateReleaseGate({ ...releaseInput, playtesterFidelity: { verdict: 'FAIL' } }),
  /non-authoritative input: playtesterFidelity/
);

console.log('L4 production-agent integrity selftest: PASS');
