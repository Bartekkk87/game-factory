import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const productionSource = fs.readFileSync(path.join(root, 'factory', 'src', 'index.mjs'), 'utf8');
const productionWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'produce.yml'), 'utf8');
const reviewWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'review.yml'), 'utf8');
const orchestrationSource = fs.readFileSync(path.join(root, 'factory', 'src', 'learning', 'orchestrate.mjs'), 'utf8');
// C2 has one canonical Production hook in index.mjs; produce.yml must not add a parallel orchestration path.
assert.match(productionSource, /orchestrateControlledLearning\(\{\s*eventKind:\s*'production-run'/s);
assert.doesNotMatch(productionWorkflow, /Run controlled learning orchestration/);
assert.match(productionWorkflow, /node factory\/src\/index\.mjs/);
assert.match(reviewWorkflow, /Run controlled learning orchestration/);
assert.match(reviewWorkflow, /GF_LEARNING_EVENT_KIND:\s*owner-feedback/);
assert.match(reviewWorkflow, /node factory\/src\/learning\/orchestrate\.mjs/);
assert.doesNotMatch(orchestrationSource, /\bvalidateCandidate\b|\bpromoteCandidate\b|\bdeactivateCandidate\b/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-orchestration-'));
fs.cpSync(path.join(root, 'factory'), path.join(tmp, 'factory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'memory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'learning', 'evidence', 'owner-feedback'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'memory', 'memory.json'), JSON.stringify({ products: [], lessons: [], stats: {} }, null, 2));

function writeRun(id, { failure = null, candidateSha = null } = {}) {
  const runDir = path.join(tmp, 'runs', id);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({
    run: { id, status: 'release-eligible', candidateSha },
    gates: { technical: { pass: true }, productFidelity: { pass: true } },
    events: failure ? [{ failureSignature: failure }] : [],
    costs: { costUsd: 0, tokens: 0, attempts: [] }
  }, null, 2));
}

writeRun('run-1', { candidateSha: 'sha-owner' });
writeRun('run-2', { failure: 'fixture:recurring-verifier-failure' });
writeRun('run-3', { failure: 'fixture:recurring-verifier-failure' });

const feedbackId = 'gh-issue-8-comment-8001';
fs.writeFileSync(path.join(tmp, 'learning', 'evidence', 'owner-feedback', `${feedbackId}.json`), JSON.stringify({
  schemaVersion: 'owner-feedback-v1',
  id: feedbackId,
  rawText: '/reject Visual target was not met.',
  parsedCommand: 'reject',
  parsedReason: 'Visual target was not met.',
  sourceRunIds: ['run-1'],
  candidateSha: 'sha-owner',
  createdAt: '2026-08-27T18:00:00Z'
}, null, 2));

const orchestration = await import(pathToFileURL(path.join(tmp, 'factory', 'src', 'learning', 'orchestrate.mjs')));
const store = await import(pathToFileURL(path.join(tmp, 'factory', 'src', 'memory', 'store.mjs')));

const feedbackFirst = orchestration.orchestrateControlledLearning({ eventKind: 'owner-feedback', eventId: feedbackId });
assert.equal(feedbackFirst.created, true);
assert.equal(feedbackFirst.triggerAllowed, true);
assert.equal(feedbackFirst.focusScope, 'product-feedback');
assert.ok(feedbackFirst.candidateId);
assert.equal(feedbackFirst.candidateActive, false);
const feedbackCandidate = JSON.parse(fs.readFileSync(path.join(tmp, 'learning', 'candidates', `${feedbackFirst.candidateId}.json`), 'utf8'));
assert.equal(feedbackCandidate.status, 'candidate');
assert.equal(feedbackCandidate.active, false);
assert.equal(feedbackCandidate.targetLayer, 'owner-contract');
assert.deepEqual(feedbackCandidate.ownerFeedbackIds, [feedbackId]);
assert.equal(store.lessonsFor('director').some((lesson) => lesson.includes(feedbackFirst.candidateId)), false);

const feedbackSecond = orchestration.orchestrateControlledLearning({ eventKind: 'owner-feedback', eventId: feedbackId });
assert.equal(feedbackSecond.created, false);
assert.equal(feedbackSecond.candidateId, feedbackFirst.candidateId);
assert.equal(fs.readdirSync(path.join(tmp, 'learning', 'candidates')).filter((name) => name.endsWith('.json')).length, 1);

const engineering = orchestration.orchestrateControlledLearning({ eventKind: 'production-run', eventId: 'run-3' });
assert.equal(engineering.created, true);
assert.equal(engineering.triggerAllowed, true);
assert.equal(engineering.focusScope, 'engineering');
assert.ok(engineering.candidateId);
assert.equal(engineering.candidateActive, false);
const engineeringCandidate = JSON.parse(fs.readFileSync(path.join(tmp, 'learning', 'candidates', `${engineering.candidateId}.json`), 'utf8'));
assert.equal(engineeringCandidate.status, 'candidate');
assert.equal(engineeringCandidate.active, false);
assert.equal(engineeringCandidate.targetLayer, 'skill');
assert.ok(engineeringCandidate.sourceRunIds.includes('run-2'));
assert.ok(engineeringCandidate.sourceRunIds.includes('run-3'));
assert.equal(store.lessonsFor('engineer').some((lesson) => lesson.includes(engineering.candidateId)), false);

const receiptFiles = fs.readdirSync(path.join(tmp, 'learning', 'orchestration')).filter((name) => name.endsWith('.json'));
assert.equal(receiptFiles.length, 2);
for (const name of receiptFiles) {
  const receipt = JSON.parse(fs.readFileSync(path.join(tmp, 'learning', 'orchestration', name), 'utf8'));
  assert.equal(receipt.canValidate, false);
  assert.equal(receipt.canActivate, false);
}

console.log('controlled learning orchestration selftest: PASS');
