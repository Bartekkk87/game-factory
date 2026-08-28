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
      { role: 'director', text: 'legacy' },
      { role: 'director', text: 'candidate', status: 'candidate', active: false },
      { role: 'director', text: 'validated inactive', status: 'validated', active: false },
      { role: 'director', text: 'validated active', status: 'validated', active: true }
    ], stats: {} }, null, 2));
    assert.deepEqual(store.lessonsFor('director'), ['- validated active']);
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
    assert.equal(store.lessonsFor('director').includes('- Corpus candidate must remain inactive until human merge.'), false);
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
