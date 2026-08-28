import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const sourceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-s4-application-'));
fs.cpSync(path.join(sourceRoot, 'factory'), path.join(tmp, 'factory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'memory'), { recursive: true });
fs.writeFileSync(
  path.join(tmp, 'memory', 'memory.json'),
  `${JSON.stringify({ products: [], lessons: [], stats: {} }, null, 2)}\n`
);

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: tmp, encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function commit(message) {
  git(['add', '.']);
  git(['commit', '-m', message]);
  return git(['rev-parse', 'HEAD']).stdout.trim();
}

function shaFile(relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(tmp, relative))).digest('hex');
}

function binding(relative) {
  return { ref: relative, sha256: shaFile(relative) };
}

function writeJson(relative, value) {
  const file = path.join(tmp, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

git(['init', '-b', 'main']);
git(['config', 'user.email', 's4-fixture@example.invalid']);
git(['config', 'user.name', 'S4 Fixture']);
commit('fixture base');

const lifecycle = await import(pathToFileURL(path.join(tmp, 'factory/src/learning/lifecycle.mjs')));

function create(id, targetLayer = 'evaluation') {
  return lifecycle.createCandidate({
    id,
    role: 'auditor',
    scope: 'evaluation-failure-analysis',
    targetLayer,
    text: `S4 fixture ${id}`,
    sourceRunIds: ['run-s4-fixture'],
    sourceKind: 's4-fixture',
    ownerFeedbackIds: [],
    createdAt: '2026-08-28T18:00:00Z'
  });
}

function validate(id) {
  return lifecycle.validateCandidate(id, {
    validationEvidence: [{ kind: 's4-fixture-review', passed: true }],
    regressionResults: [{ suite: 's4-pre-application', passed: true }],
    validatedAt: '2026-08-28T18:05:00Z'
  });
}

create('candidate-s4');
validate('candidate-s4');
create('candidate-prompt', 'prompt');
validate('candidate-prompt');
create('candidate-unvalidated');
create('candidate-nonprotected', 'director');
validate('candidate-nonprotected');

const validatedCandidateCommit = commit('fixture validated candidates');
const tree = git(['rev-parse', 'HEAD^{tree}']).stdout.trim();
const nonAncestor = spawnSync(
  'git',
  ['commit-tree', tree, '-p', validatedCandidateCommit, '-m', 'fixture side commit'],
  { cwd: tmp, encoding: 'utf8' }
);
assert.equal(nonAncestor.status, 0, nonAncestor.stderr);
const sideCommit = nonAncestor.stdout.trim();

writeJson('evaluation/s4-protected-fixture.json', {
  schemaVersion: 's4-protected-fixture-v1',
  rule: 'human-reviewed protected-layer fixture'
});
const mergeCommitSha = commit('fixture human-reviewed protected-layer implementation');

function regressionRef(id) {
  return `learning/evidence/applications/${id}-full-verifier.json`;
}

for (const id of ['candidate-s4', 'candidate-prompt', 'candidate-unvalidated', 'candidate-nonprotected']) {
  writeJson(regressionRef(id), {
    schemaVersion: lifecycle.APPLICATION_REGRESSION_EVIDENCE_SCHEMA,
    candidateId: id,
    evaluatedCommitSha: mergeCommitSha,
    kind: 'full-verifier',
    sourceRef: 'fixture-full-verifier',
    outcome: 'PASS'
  });
}

writeJson('evaluation/results/S4-fixture-corpus.json', {
  schemaVersion: 'game-factory.golden-corpus-evaluation-report/v1',
  evaluatedCommitSha: mergeCommitSha,
  baseline: {
    baselineId: 's4-fixture-baseline',
    compatibility: { registryBlobMatch: true, s1ManifestBlobMatch: true, compatible: true }
  },
  metrics: { expectedMismatchCount: 0, criticalFalsePassCount: 0 },
  policy: { corpusRegression: false, criticalFalsePassRegression: false }
});
commit('fixture post-merge regression and corpus evidence');

function applicationArgs(id = 'candidate-s4', overrides = {}) {
  const candidateRef = `learning/candidates/${id}.json`;
  return {
    candidateArtifactSha256: fs.existsSync(path.join(tmp, candidateRef)) ? shaFile(candidateRef) : '0'.repeat(64),
    changeScope: 'bounded evaluation-layer fixture change',
    prRef: '#999',
    mergeCommitSha,
    humanApprovalRef: 'fixture-human-approval',
    regressionEvidence: [binding(regressionRef(id))],
    corpusEvidence: binding('evaluation/results/S4-fixture-corpus.json'),
    appliedAt: '2026-08-28T18:15:00Z',
    ...overrides
  };
}

assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-unvalidated', applicationArgs('candidate-unvalidated')),
  /must be validated and inactive/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-prompt', applicationArgs('candidate-prompt')),
  /not an S4 non-prompt protected layer/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-nonprotected', applicationArgs('candidate-nonprotected')),
  /not an S4 non-prompt protected layer/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs('candidate-s4', { prRef: 'not-a-pr' })),
  /prRef must identify/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs('candidate-s4', { mergeCommitSha: '0'.repeat(40) })),
  /merge commit is unknown/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs('candidate-s4', { mergeCommitSha: sideCommit })),
  /not merged into current HEAD/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs('candidate-s4', { candidateArtifactSha256: 'f'.repeat(64) })),
  /artifact sha256 mismatch/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs('candidate-s4', { regressionEvidence: [] })),
  /regressionEvidence is required/
);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs('candidate-s4', {
    regressionEvidence: [{ ref: regressionRef('candidate-s4'), sha256: '0'.repeat(64) }]
  })),
  /sha256 mismatch/
);

const candidateRef = 'learning/candidates/candidate-s4.json';
const memoryFile = path.join(tmp, 'memory/memory.json');
const candidateBefore = fs.readFileSync(path.join(tmp, candidateRef), 'utf8');
const memoryBefore = fs.readFileSync(memoryFile, 'utf8');
const created = lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs());
assert.equal(created.created, true);
assert.equal(created.schemaVersion, lifecycle.APPLICATION_RECEIPT_SCHEMA);
assert.equal(created.terminalState, lifecycle.APPLICATION_TERMINAL_STATE);
assert.equal(created.candidateId, 'candidate-s4');
assert.equal(created.targetLayer, 'evaluation');
assert.equal(created.implementation.prRef, '#999');
assert.equal(created.implementation.mergeCommitSha, mergeCommitSha);
assert.equal(created.regressionEvidence[0].outcome, 'PASS');
assert.equal(created.corpusEvidence.outcome, 'PASS');
assert.equal(fs.readFileSync(path.join(tmp, candidateRef), 'utf8'), candidateBefore);
assert.equal(fs.readFileSync(memoryFile, 'utf8'), memoryBefore);

const receiptFile = path.join(tmp, 'learning/applications/candidate-s4.json');
const receiptBytes = fs.readFileSync(receiptFile, 'utf8');
const duplicate = lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs());
assert.equal(duplicate.created, false);
assert.equal(fs.readFileSync(receiptFile, 'utf8'), receiptBytes);
assert.throws(
  () => lifecycle.recordApplicationReceipt('candidate-s4', applicationArgs('candidate-s4', { prRef: '#1000' })),
  /existing receipt is immutable/
);

const promptRef = 'learning/candidates/candidate-prompt.json';
const promptSha = shaFile(promptRef);
assert.throws(
  () => lifecycle.promoteCandidate('candidate-prompt', {
    approvedBy: 'model',
    approvalKind: 'model',
    promotionRef: '#998',
    mergeCommitSha: validatedCandidateCommit,
    candidateArtifactSha256: promptSha
  }),
  /human-merge/
);
assert.throws(
  () => lifecycle.promoteCandidate('candidate-prompt', {
    approvedBy: 'owner',
    approvalKind: 'human-merge',
    promotionRef: 'not-a-pr',
    mergeCommitSha: validatedCandidateCommit,
    candidateArtifactSha256: promptSha
  }),
  /prRef must identify/
);
assert.throws(
  () => lifecycle.promoteCandidate('candidate-prompt', {
    approvedBy: 'owner',
    approvalKind: 'human-merge',
    promotionRef: '#998',
    mergeCommitSha: validatedCandidateCommit,
    candidateArtifactSha256: '0'.repeat(64)
  }),
  /artifact sha256 mismatch/
);

const promptBefore = fs.readFileSync(path.join(tmp, promptRef), 'utf8');
const promoted = lifecycle.promoteCandidate('candidate-prompt', {
  approvedBy: 'owner',
  approvalKind: 'human-merge',
  promotionRef: '#998',
  mergeCommitSha: validatedCandidateCommit,
  candidateArtifactSha256: promptSha,
  activatedAt: '2026-08-28T18:20:00Z'
});
assert.equal(promoted.active, true);
assert.notEqual(fs.readFileSync(path.join(tmp, promptRef), 'utf8'), promptBefore);
const promotion = JSON.parse(fs.readFileSync(path.join(tmp, 'learning/promotions/candidate-prompt.json'), 'utf8'));
assert.equal(promotion.schemaVersion, 'learning-promotion-v2');
assert.equal(promotion.promotionRef, '#998');
assert.equal(promotion.mergeCommitSha, validatedCandidateCommit);
assert.equal(promotion.candidateArtifact.sha256, promptSha);
assert.equal(JSON.parse(fs.readFileSync(receiptFile, 'utf8')).terminalState, 'APPLIED-CLOSED');

console.log('S4 application receipt + SHA-bound prompt promotion selftest: PASS');
