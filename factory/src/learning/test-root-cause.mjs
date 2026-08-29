import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFailedProductionRun, proposalFromRootCause } from './root-cause.mjs';

const source = fs.readFileSync(new URL('./root-cause.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(
  source,
  /^import\s+.*state-semantics\.mjs.*$/m,
  'root-cause falsifier must not import the verifier state vocabulary it is supposed to challenge'
);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-root-cause-'));
const runId = 'failed-fixture-1';
const runDir = path.join(root, runId);
fs.mkdirSync(runDir, { recursive: true });

fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({
  run: { id: runId, status: 'failed', reason: 'debug_exhausted' },
  gates: { technical: { pass: false }, productFidelity: { pass: false } }
}, null, 2));
fs.writeFileSync(path.join(runDir, 'FAILURE.json'), JSON.stringify({ reason: 'debug_exhausted' }, null, 2));
fs.writeFileSync(path.join(runDir, 'gdd.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC-FAIL', probe: { id: 'PR-FAIL', kind: 'state_reached', state: 'failed' } },
    { id: 'AC-WIN', probe: { id: 'PR-WIN', kind: 'state_reached', state: 'success' } }
  ],
  proofPlan: {
    pass: true,
    scenarios: [
      { id: 'base', inputMode: 'active+idle-control', seconds: 12, stopStates: [], restartAtEnd: false },
      { id: 'success-proof', inputMode: 'active', seconds: 75, stopStates: ['success'], restartAtEnd: true }
    ]
  }
}, null, 2));

function writeAttempt(number, failedChecks, { runtimeErrors = [], observedStates = ['title', 'playing'], fidelity = [] } = {}) {
  const dir = path.join(runDir, `attempt-${String(number).padStart(2, '0')}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'evidence-tech.json'), JSON.stringify({
    contract: {
      pass: failedChecks === 0,
      checks: Array.from({ length: failedChecks }, (_, index) => ({ id: `TECH-${index + 1}`, pass: false })),
      runtimeErrors
    },
    telemetry: observedStates.map((state, index) => ({ phase: `p${index}`, snapshot: { state, errors: runtimeErrors } }))
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'evidence-fidelity.json'), JSON.stringify({ pass: fidelity.length === 0, criteria: fidelity }, null, 2));
  fs.writeFileSync(path.join(dir, 'telemetry.json'), JSON.stringify({
    proofScenarios: observedStates.map((state, index) => ({ id: `s${index}`, endState: state }))
  }, null, 2));
}

const failedCriterion = {
  requirementId: 'MH-04',
  probeId: 'PR-FAIL',
  kind: 'state_reached',
  pass: false,
  detail: 'state failed not reached in verifier scenarios'
};
writeAttempt(1, 9, { observedStates: ['title', 'playing'], fidelity: [failedCriterion] });
writeAttempt(2, 2, { observedStates: ['title', 'playing', 'gameover'], fidelity: [failedCriterion] });
writeAttempt(3, 5, { runtimeErrors: ['ellipse requires 7 arguments'], observedStates: ['title', 'playing'], fidelity: [failedCriterion] });

try {
  const report = analyzeFailedProductionRun({ runId, runsRoot: root });
  assert.equal(report.schemaVersion, 'failed-run-root-cause-v1');
  assert.deepEqual(report.trajectory, [10, 3, 6]);
  assert.equal(report.bestAttempt, 'attempt-02');
  assert.equal(report.finalAttempt, 'attempt-03');
  assert.equal(report.authority.mustNot.includes('activate-candidate'), true);
  assert.match(report.diagnosticIndependence, /do not import verifier state semantics/);
  const ids = report.findings.map((item) => item.id);
  assert(ids.includes('repair-regression-after-best-attempt'));
  assert(ids.includes('new-runtime-error-after-repair'));
  assert(ids.includes('terminal-proof-scenario-gap'));
  assert(ids.includes('terminal-state-vocabulary-mismatch'));
  assert.equal(report.findings.find((item) => item.id === 'terminal-proof-scenario-gap').confidence, 1);
  const proposal = proposalFromRootCause(report, 'candidate-fixture');
  assert.equal(proposal.scope, 'case-root-cause');
  assert.equal(proposal.active, undefined);
  assert.deepEqual(proposal.sourceRunIds, [runId]);
  assert.match(proposal.text, /Hypothesis only/);
  assert.match(proposal.text, /Do not activate/);

  const directorRunId = 'director-contract-fixture';
  const directorRunDir = path.join(root, directorRunId);
  fs.mkdirSync(directorRunDir, { recursive: true });
  fs.writeFileSync(path.join(directorRunDir, 'RUN-EVIDENCE.json'), JSON.stringify({
    run: { id: directorRunId, status: 'failed', reason: 'director_failed' },
    gates: { technical: { pass: false }, productFidelity: { pass: false } }
  }, null, 2));
  fs.writeFileSync(path.join(directorRunDir, 'FAILURE.json'), JSON.stringify({
    reason: 'director_failed',
    error: 'Director proof plan unreachable: probe PR-MH-03 uses unsupported verifier state restored; probe PR-MH-04 uses unsupported verifier state glass_breach'
  }, null, 2));

  const directorReport = analyzeFailedProductionRun({ runId: directorRunId, runsRoot: root });
  assert.equal(directorReport.primaryFindingId, 'director-verifier-state-contract-mismatch');
  assert.deepEqual(directorReport.trajectory, []);
  assert.equal(directorReport.findings[0].confidence, 1);
  assert.equal(directorReport.findings[0].targetLayer, 'skill');
  assert.equal(directorReport.findings[0].role, 'director');
  assert.match(directorReport.findings[0].summary, /PR-MH-03=restored/);
  assert.match(directorReport.findings[0].summary, /PR-MH-04=glass_breach/);
  const directorProposal = proposalFromRootCause(directorReport, 'candidate-lumen-state-protocol');
  assert.equal(directorProposal.targetLayer, 'skill');
  assert.equal(directorProposal.role, 'director');
  assert.deepEqual(directorProposal.sourceRunIds, [directorRunId]);
  assert.match(directorProposal.text, /finite verifier state protocol/);
  assert.match(directorProposal.text, /Do not activate/);

  const impossibleRunId = 'director-impossible-probe-fixture';
  const impossibleRunDir = path.join(root, impossibleRunId);
  fs.mkdirSync(impossibleRunDir, { recursive: true });
  fs.writeFileSync(path.join(impossibleRunDir, 'RUN-EVIDENCE.json'), JSON.stringify({
    run: { id: impossibleRunId, status: 'failed', reason: 'debug_exhausted' },
    gates: { technical: { pass: true }, productFidelity: { pass: false } }
  }, null, 2));
  fs.writeFileSync(path.join(impossibleRunDir, 'FAILURE.json'), JSON.stringify({ reason: 'debug_exhausted' }, null, 2));
  fs.writeFileSync(path.join(impossibleRunDir, 'gdd.json'), JSON.stringify({
    probePlan: {
      requirementProbes: [
        { id: 'PR-MH-01', kind: 'event_value_change', eventType: 'player_moved', beforeField: 'playerX', afterField: 'playerX' },
        { id: 'PR-MH-05', kind: 'event_value_change', eventType: 'run_restarted', beforeField: 'runCount', afterField: 'runCount' },
        { id: 'PR-MH-07', kind: 'event_value_change', eventType: 'pressure_escalated', beforeField: 'hazardSpeed', afterField: 'hazardSpeed' }
      ]
    },
    proofPlan: { pass: true, scenarios: [{ id: 'base', inputMode: 'active+idle-control', seconds: 12, stopStates: [], restartAtEnd: false }] }
  }, null, 2));

  const impossibleReport = analyzeFailedProductionRun({ runId: impossibleRunId, runsRoot: root });
  assert.equal(impossibleReport.primaryFindingId, 'director-probe-contract-unsatisfiable');
  assert.equal(impossibleReport.findings[0].confidence, 1);
  assert.equal(impossibleReport.findings[0].targetLayer, 'control-plane');
  assert.equal(impossibleReport.findings[0].role, 'director');
  assert.equal(impossibleReport.unsatisfiableProbes.length, 3);
  assert.match(impossibleReport.findings[0].summary, /PR-MH-01:playerX=playerX/);
  assert.match(impossibleReport.findings[0].summary, /PR-MH-05:runCount=runCount/);
  assert.match(impossibleReport.findings[0].summary, /PR-MH-07:hazardSpeed=hazardSpeed/);
  const impossibleProposal = proposalFromRootCause(impossibleReport, 'candidate-impossible-probe');
  assert.equal(impossibleProposal.targetLayer, 'control-plane');
  assert.equal(impossibleProposal.role, 'director');
  assert.match(impossibleProposal.text, /Reject unsatisfiable event_value_change probes/);

  const earlyImpossibleRunId = 'director-early-impossible-probe-fixture';
  const earlyImpossibleRunDir = path.join(root, earlyImpossibleRunId);
  fs.mkdirSync(earlyImpossibleRunDir, { recursive: true });
  fs.writeFileSync(path.join(earlyImpossibleRunDir, 'RUN-EVIDENCE.json'), JSON.stringify({
    run: { id: earlyImpossibleRunId, status: 'failed', reason: 'director_failed' },
    gates: { technical: { pass: false }, productFidelity: { pass: false } }
  }, null, 2));
  fs.writeFileSync(path.join(earlyImpossibleRunDir, 'FAILURE.json'), JSON.stringify({
    reason: 'director_failed',
    error: 'Director proof plan unreachable: probe PR-MH-01 event_value_change is unsatisfiable: beforeField and afterField are both playerX'
  }, null, 2));
  const earlyImpossibleReport = analyzeFailedProductionRun({ runId: earlyImpossibleRunId, runsRoot: root });
  assert.equal(earlyImpossibleReport.primaryFindingId, 'director-probe-contract-unsatisfiable');
  assert.deepEqual(earlyImpossibleReport.trajectory, []);
  assert.match(earlyImpossibleReport.findings[0].summary, /PR-MH-01:playerX=playerX/);

  // Historical regressions must be immutable fixtures, never optional runtime
  // directories. Missing fixture evidence is therefore a hard test failure.
  const fixturePath = path.join(repoRoot, 'examples', 'fixtures', 'regressions', 'lumen-director-state-contract.json');
  assert.equal(fs.existsSync(fixturePath), true, 'Lumen historical regression fixture is required');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.equal(fixture.schemaVersion, 'game-factory.historical-regression-fixture/v1');
  assert.equal(fixture.origin.runId, '20260828-201007');
  assert.match(fixture.origin.evidenceCommitSha, /^[0-9a-f]{40}$/);
  assert.equal(fixture.origin.sourceRefs.length, 2);
  assert(fixture.origin.sourceRefs.every((ref) => /^[0-9a-f]{40}$/.test(ref.gitBlobSha)));

  const historicalRoot = path.join(root, 'historical');
  const historicalRunId = fixture.id;
  const historicalRunDir = path.join(historicalRoot, historicalRunId);
  fs.mkdirSync(historicalRunDir, { recursive: true });
  fs.writeFileSync(path.join(historicalRunDir, 'RUN-EVIDENCE.json'), JSON.stringify(fixture.runEvidence, null, 2));
  fs.writeFileSync(path.join(historicalRunDir, 'FAILURE.json'), JSON.stringify(fixture.failure, null, 2));

  const historical = analyzeFailedProductionRun({ runId: historicalRunId, runsRoot: historicalRoot });
  assert.equal(historical.primaryFindingId, fixture.expected.primaryFindingId);
  assert.equal(historical.findings[0].targetLayer, fixture.expected.targetLayer);
  for (const term of fixture.expected.requiredEvidenceTerms) {
    assert.match(historical.findings[0].summary, new RegExp(term));
  }

  fs.writeFileSync(path.join(runDir, 'RUN-EVIDENCE.json'), JSON.stringify({ run: { id: runId, status: 'success' } }, null, 2));
  assert.throws(() => analyzeFailedProductionRun({ runId, runsRoot: root }), /only accepts failed production runs/);
  console.log('autonomous failed-run root cause selftest: PASS');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
