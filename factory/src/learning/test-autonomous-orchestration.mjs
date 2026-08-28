import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-auto-root-orchestration-'));
fs.cpSync(path.join(root, 'factory'), path.join(tmp, 'factory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'memory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'learning', 'evidence', 'owner-feedback'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'memory', 'memory.json'), JSON.stringify({ products: [], lessons: [], stats: {} }, null, 2));

const runId = 'single-failed-run';
const runDir = path.join(tmp, 'runs', runId);
const attemptDir = path.join(runDir, 'attempt-01');
fs.mkdirSync(attemptDir, { recursive: true });
fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({
  run: { id: runId, status: 'failed', reason: 'debug_exhausted' },
  gates: { technical: { pass: true }, productFidelity: { pass: false } },
  events: [], costs: { costUsd: 0, tokens: 0, attempts: [] }
}, null, 2));
fs.writeFileSync(path.join(runDir, 'gdd.json'), JSON.stringify({
  requirements: [{ probe: { id: 'PR-MH-04', kind: 'state_reached', state: 'failed' } }],
  proofPlan: { pass: true, scenarios: [{ id: 'success-proof', inputMode: 'active', seconds: 75, stopStates: ['success'], restartAtEnd: true }] }
}, null, 2));
fs.writeFileSync(path.join(attemptDir, 'evidence-tech.json'), JSON.stringify({
  contract: { pass: true, checks: [{ id: 'runtime', pass: true }] },
  telemetry: [{ phase: 'end', snapshot: { state: 'gameover', errors: [] } }]
}, null, 2));
fs.writeFileSync(path.join(attemptDir, 'evidence-fidelity.json'), JSON.stringify({
  pass: false,
  criteria: [{ requirementId: 'MH-04', probeId: 'PR-MH-04', kind: 'state_reached', pass: false, detail: 'state failed not reached in verifier scenarios' }]
}, null, 2));
fs.writeFileSync(path.join(attemptDir, 'telemetry.json'), JSON.stringify({ endState: 'gameover' }, null, 2));

try {
  const orchestration = await import(pathToFileURL(path.join(tmp, 'factory', 'src', 'learning', 'orchestrate.mjs')));
  const first = orchestration.orchestrateControlledLearning({ eventKind: 'production-run', eventId: runId });
  assert.equal(first.created, true);
  assert.equal(first.triggerAllowed, true);
  assert.deepEqual(first.triggerReasons, ['failed-production-run-requires-case-root-cause']);
  assert.equal(first.focusScope, 'case-root-cause');
  assert.ok(first.rootCauseRef);
  assert.ok(first.analysisRef);
  assert.ok(first.candidateId);
  assert.equal(first.candidateActive, false);

  const rootCause = JSON.parse(fs.readFileSync(path.join(tmp, first.rootCauseRef), 'utf8'));
  assert.equal(rootCause.runId, runId);
  assert(rootCause.findings.some((finding) => finding.id === 'terminal-proof-scenario-gap'));
  assert(rootCause.findings.some((finding) => finding.id === 'terminal-state-vocabulary-mismatch'));
  const candidate = JSON.parse(fs.readFileSync(path.join(tmp, 'learning', 'candidates', `${first.candidateId}.json`), 'utf8'));
  assert.equal(candidate.status, 'candidate');
  assert.equal(candidate.active, false);
  assert.equal(candidate.scope, 'case-root-cause');
  assert.equal(candidate.sourceKind, 'autonomous-failed-run-root-cause');
  assert.equal(candidate.targetLayer, 'verifier');

  const second = orchestration.orchestrateControlledLearning({ eventKind: 'production-run', eventId: runId });
  assert.equal(second.created, false);
  assert.equal(second.candidateId, first.candidateId);
  assert.equal(fs.readdirSync(path.join(tmp, 'learning', 'root-causes')).filter((name) => name.endsWith('.json')).length, 1);
  assert.equal(fs.readdirSync(path.join(tmp, 'learning', 'candidates')).filter((name) => name.endsWith('.json')).length, 1);

  console.log('autonomous failed-run orchestration selftest: PASS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
