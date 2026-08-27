import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createOwnerContract, ownerRequirementIds } from '../contract/owner.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { evaluateProductFidelity } from '../verify/fidelity.mjs';
import { evaluateReleaseGate } from '../control/release-gate.mjs';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const engineerPrompt = read('factory/prompts/engineer.md');
const engineerSource = read('factory/src/roles/engineer.mjs');
const playtesterPrompt = read('factory/prompts/playtester.md');
const playtesterSource = read('factory/src/roles/playtester.mjs');
const auditorPrompt = read('factory/prompts/auditor.md');
const auditorSource = read('factory/src/roles/auditor.mjs');
const pipelineSource = read('factory/src/pipeline/run.mjs');
const routerTestSource = read('factory/src/llm/test-router.mjs');

assert.doesNotMatch(engineerPrompt, /random input/i);
assert.doesNotMatch(engineerPrompt, /~\s*15\s*seconds/i);
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
assert.doesNotMatch(auditorSource, /audit\.verdict/);
assert.match(auditorSource, /audit\.assessment/);
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

const release = evaluateReleaseGate({
  technical: { pass: true },
  productFidelity: fidelity,
  experienceScore: 7.2,
  budget: { pass: true, spentUsd: 0.25, budgetUsd: 1 },
  minExperience: 6.5
});
assert.equal(release.pass, true);
assert.deepEqual(release.reasons, []);

const advisoryDisagreementDoesNotChangeRelease = evaluateReleaseGate({
  technical: { pass: true },
  productFidelity: fidelity,
  experienceScore: 7.2,
  budget: { pass: true, spentUsd: 0.25, budgetUsd: 1 },
  minExperience: 6.5,
  audit: { assessment: 'CONCERNS' },
  playtesterFidelity: { verdict: 'FAIL' }
});
assert.equal(advisoryDisagreementDoesNotChangeRelease.pass, true);

console.log('L4 production-agent integrity selftest: PASS');
