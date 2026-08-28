import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-evaluation-intake-'));
fs.cpSync(path.join(root, 'factory'), path.join(tmp, 'factory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'memory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'evaluation', 'results'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'memory', 'memory.json'), JSON.stringify({ products: [], lessons: [], stats: {} }, null, 2));

const reportPath = 'evaluation/results/s3-fixture.json';
const reportFile = path.join(tmp, reportPath);
const commitSha = 'a'.repeat(40);
const baseCase = {
  caseId: 'eval-fixture-case',
  population: 'development-regression',
  parentSeedId: 'seed-fixture',
  domain: 'factory-reliability',
  failureClass: 'verifier-evidence-selection',
  varianceFamily: 'temporal-evidence-window',
  severity: 'critical-integrity',
  sourceKind: 'selftest',
  script: 'factory/src/verify/test-fixture.mjs',
  expectedCaseResult: 'PASS',
  actualCaseResult: 'FAIL',
  matchedExpected: false,
  falsePass: false,
  criticalFalsePass: false,
  failureSignature: 'b'.repeat(24),
  diagnostic: 'fixture mismatch diagnostic'
};

function writeReport(caseResult = baseCase, compatible = true) {
  const cases = Array.isArray(caseResult) ? caseResult : [caseResult];
  fs.writeFileSync(reportFile, JSON.stringify({
    schemaVersion: 'game-factory.golden-corpus-evaluation-report/v1',
    evaluatedCommitSha: commitSha,
    generatedAt: '2026-08-28T15:00:00.000Z',
    baseline: {
      baselineId: 's1-closure-reference',
      evaluatedCommitSha: 'c'.repeat(40),
      compatibility: { compatible }
    },
    cases
  }, null, 2));
}

function jsonFiles(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort() : [];
}

try {
  const intakeSource = fs.readFileSync(path.join(tmp, 'factory', 'src', 'evaluation', 'intake-failures.mjs'), 'utf8');
  const orchestrationSource = fs.readFileSync(path.join(tmp, 'factory', 'src', 'learning', 'orchestrate.mjs'), 'utf8');
  assert.doesNotMatch(intakeSource, /\bvalidateCandidate\b|\bpromoteCandidate\b|\bdeactivateCandidate\b/);
  assert.doesNotMatch(orchestrationSource, /\bvalidateCandidate\b|\bpromoteCandidate\b|\bdeactivateCandidate\b/);

  writeReport();
  const intake = await import(pathToFileURL(path.join(tmp, 'factory', 'src', 'evaluation', 'intake-failures.mjs')));
  const first = intake.intakeEvaluationFailures({ reportPath, observationId: 'run-1-attempt-1' });
  assert.equal(first.mismatches, 1);
  assert.equal(first.evidenceCreated, 1);
  assert.equal(first.receipts[0].candidateId, null);
  assert.equal(first.receipts[0].candidateActive, null);
  assert.equal(first.receipts[0].reproducibilityStatus, 'unconfirmed');
  assert.deepEqual(first.receipts[0].triggerReasons, ['evaluation-failure-requires-analysis']);
  assert.equal(first.receipts[0].canValidate, false);
  assert.equal(first.receipts[0].canActivate, false);

  const evidenceDir = path.join(tmp, 'learning', 'evidence', 'evaluation-failures');
  const firstEvidence = JSON.parse(fs.readFileSync(path.join(evidenceDir, `${first.evidenceIds[0]}.json`), 'utf8'));
  assert.equal(firstEvidence.eventKind, 'evaluation-failure');
  assert.equal(firstEvidence.evaluation.evaluatedCommitSha, commitSha);
  assert.equal(firstEvidence.case.caseId, baseCase.caseId);
  assert.equal(firstEvidence.classification.status, 'known');
  assert.equal(firstEvidence.classification.productionFailure, false);
  assert.equal(firstEvidence.classification.verifierInfrastructureFailure, false);
  assert.equal(firstEvidence.classification.fixtureCauseInferred, false);
  assert.equal(firstEvidence.classification.flakeStatus, 'unconfirmed');
  assert.equal(firstEvidence.authority.mustNot.includes('activate-candidate'), true);
  assert.equal(jsonFiles(path.join(tmp, 'learning', 'candidates')).length, 0);

  const firstReceiptName = jsonFiles(path.join(tmp, 'learning', 'orchestration'))[0];
  const firstReceipt = JSON.parse(fs.readFileSync(path.join(tmp, 'learning', 'orchestration', firstReceiptName), 'utf8'));
  assert.ok(firstReceipt.analysisRef);
  const firstAnalysis = JSON.parse(fs.readFileSync(path.join(tmp, firstReceipt.analysisRef), 'utf8'));
  assert.match(firstAnalysis.conclusion, /Analysis stopped safely/);
  assert.equal(firstAnalysis.candidateId, null);

  const duplicate = intake.intakeEvaluationFailures({ reportPath, observationId: 'run-1-attempt-1' });
  assert.equal(duplicate.evidenceCreated, 0);
  assert.equal(jsonFiles(evidenceDir).length, 1);
  assert.equal(jsonFiles(path.join(tmp, 'learning', 'candidates')).length, 0);

  const second = intake.intakeEvaluationFailures({ reportPath, observationId: 'run-2-attempt-1' });
  assert.equal(second.evidenceCreated, 1);
  assert.equal(second.receipts[0].reproducibilityStatus, 'repeated');
  assert.deepEqual(second.receipts[0].triggerReasons, [
    'evaluation-failure-requires-analysis',
    'repeated-evaluation-failure-observation'
  ]);
  assert.ok(second.receipts[0].candidateId);
  assert.equal(second.receipts[0].candidateActive, false);

  const candidateFiles = jsonFiles(path.join(tmp, 'learning', 'candidates'));
  assert.equal(candidateFiles.length, 1);
  const candidate = JSON.parse(fs.readFileSync(path.join(tmp, 'learning', 'candidates', candidateFiles[0]), 'utf8'));
  assert.equal(candidate.status, 'candidate');
  assert.equal(candidate.active, false);
  assert.equal(candidate.scope, 'evaluation-failure-analysis');
  assert.equal(candidate.targetLayer, 'evaluation');
  assert.deepEqual(candidate.sourceRunIds, []);
  assert.equal(candidate.sourceEvaluationFailureIds.length, 2);
  assert.equal(candidate.ownerFeedbackIds.length, 0);

  const third = intake.intakeEvaluationFailures({ reportPath, observationId: 'run-3-attempt-1' });
  assert.equal(third.receipts[0].candidateId, second.receipts[0].candidateId);
  assert.equal(jsonFiles(path.join(tmp, 'learning', 'candidates')).length, 1);

  writeReport({ ...baseCase, caseId: 'unknown-case', failureClass: null, failureSignature: 'd'.repeat(24) });
  const unknown = intake.intakeEvaluationFailures({ reportPath, observationId: 'unknown-run-1' });
  const unknownEvidence = JSON.parse(fs.readFileSync(path.join(evidenceDir, `${unknown.evidenceIds[0]}.json`), 'utf8'));
  assert.equal(unknownEvidence.classification.status, 'unclassified');
  assert.equal(unknownEvidence.classification.failureClass, 'unclassified');
  assert.equal(unknown.receipts[0].candidateId, null);

  writeReport([
    { ...baseCase, caseId: 'same-observation-a', failureSignature: 'e'.repeat(24) },
    { ...baseCase, caseId: 'same-observation-b', failureSignature: 'e'.repeat(24) }
  ]);
  const sameObservation = intake.intakeEvaluationFailures({ reportPath, observationId: 'multi-case-one-observation' });
  assert.equal(sameObservation.mismatches, 2);
  assert.equal(sameObservation.receipts.every((receipt) => receipt.candidateId === null), true);
  assert.equal(jsonFiles(path.join(tmp, 'learning', 'candidates')).length, 1);

  writeReport({
    ...baseCase,
    actualCaseResult: 'PASS',
    matchedExpected: true,
    failureSignature: null,
    diagnostic: null
  });
  const green = intake.intakeEvaluationFailures({ reportPath, observationId: 'green-observation' });
  assert.equal(green.mismatches, 0);
  assert.equal(green.evidenceCreated, 0);
  assert.deepEqual(green.receipts, []);

  writeReport(baseCase, false);
  assert.throws(
    () => intake.intakeEvaluationFailures({ reportPath, observationId: 'incompatible-run' }),
    /incompatible corpus report/
  );

  writeReport({ ...baseCase, failureSignature: null });
  assert.throws(
    () => intake.intakeEvaluationFailures({ reportPath, observationId: 'missing-signature-run' }),
    /signature is missing/
  );

  console.log('Golden Corpus S3 evaluation-failure intake selftest: PASS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
