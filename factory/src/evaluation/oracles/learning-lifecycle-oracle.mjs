import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const caseId = caseIdFromArgs();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-corpus-learning-'));
try {
  fs.cpSync(path.join(repoRoot, 'factory'), path.join(tmp, 'factory'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'memory'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'drafts', 'fixture'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'memory', 'memory.json'), JSON.stringify({ products: [], lessons: [], stats: {} }, null, 2));
  const store = await import(pathToFileURL(path.join(tmp, 'factory/src/memory/store.mjs')));
  const lifecycle = await import(pathToFileURL(path.join(tmp, 'factory/src/learning/lifecycle.mjs')));

  if (caseId === 'fr-learning-validated-inactive-not-consumed') {
    fs.writeFileSync(path.join(tmp, 'memory', 'memory.json'), JSON.stringify({ products: [], lessons: [
      { id: 'legacy', role: 'director', text: 'legacy' },
      { id: 'candidate', role: 'director', text: 'candidate', status: 'candidate', active: false },
      { id: 'inactive', role: 'director', text: 'validated inactive', status: 'validated', active: false },
      { id: 'untyped-active', role: 'director', text: 'untyped active must stay blocked', status: 'validated', active: true },
      {
        schemaVersion: store.LESSON_SCHEMA,
        id: 'governed-active',
        role: 'director',
        scope: 'corpus-fixture',
        targetLayer: 'prompt',
        directive: 'governed active directive',
        status: 'validated',
        active: true,
        sourceRunIds: ['corpus-run'],
        ownerFeedbackIds: [],
        promotionRef: '#999',
        mergeCommitSha: '1'.repeat(40),
        candidateArtifactSha256: '2'.repeat(64)
      }
    ], stats: {} }, null, 2));
    const productionLessons = store.lessonsFor('director');
    assert.equal(productionLessons.length, 1);
    assert.equal(productionLessons[0].schemaVersion, store.LESSON_SCHEMA);
    assert.equal(productionLessons[0].id, 'governed-active');
    assert.equal(productionLessons[0].directive, 'governed active directive');
    assert.equal(productionLessons.some((lesson) => lesson.id === 'inactive'), false);
    assert.equal(productionLessons.some((lesson) => lesson.id === 'untyped-active'), false);
  } else if (caseId === 'fr-learning-lifecycle-human-gated') {
    const candidate = lifecycle.createCandidate({
      id: 'corpus-human-gate', role: 'director', scope: 'product-feedback', targetLayer: 'prompt',
      text: 'Corpus candidate must remain inactive until human merge.', sourceRunIds: ['corpus-run'],
      sourceKind: 'evaluation', confidence: 1, evidenceCount: 1, createdAt: '2026-08-29T00:00:00Z'
    });
    assert.equal(candidate.status, 'candidate');
    assert.equal(candidate.active, false);
    const validated = lifecycle.validateCandidate('corpus-human-gate', {
      validationEvidence: [{ kind: 'corpus', passed: true }],
      regressionResults: [{ suite: 'corpus', passed: true }],
      validatedAt: '2026-08-29T00:01:00Z'
    });
    assert.equal(validated.status, 'validated');
    assert.equal(validated.active, false);
    assert.equal(store.lessonsFor('director').some((lesson) => lesson.directive === 'Corpus candidate must remain inactive until human merge.'), false);
    assert.throws(() => lifecycle.promoteCandidate('corpus-human-gate', {
      approvedBy: 'model', approvalKind: 'model', promotionRef: '#999', mergeCommitSha: '0'.repeat(40), candidateArtifactSha256: '0'.repeat(64)
    }), /human-merge/);
  } else {
    throw new Error(`unsupported learning-lifecycle corpus case: ${caseId}`);
  }

  console.log(JSON.stringify({ caseId, observation: 'PASS' }));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
