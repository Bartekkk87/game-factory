import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from '../config.mjs';
import { readJson, writeJson } from '../util/fsx.mjs';
import { orchestrateControlledLearning } from '../learning/orchestrate.mjs';

export const EVALUATION_FAILURE_EVIDENCE_SCHEMA = 'evaluation-failure-evidence-v1';
const REPORT_SCHEMA = 'game-factory.golden-corpus-evaluation-report/v1';
const EVIDENCE_DIR = path.join(ROOT, 'learning', 'evidence', 'evaluation-failures');

function stableKey(value, length = 24) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length);
}

function repoRelative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function safeRepoJsonPath(value) {
  const rel = String(value || '').trim();
  if (!rel || path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..') || !rel.endsWith('.json')) {
    throw new Error(`unsafe evaluation report path: ${rel || '(empty)'}`);
  }
  const absolute = path.resolve(ROOT, rel);
  if (!absolute.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(absolute)) {
    throw new Error(`evaluation report unavailable: ${rel}`);
  }
  return absolute;
}

function assertObservationId(value) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(id)) throw new Error(`invalid evaluation observation id: ${id || '(empty)'}`);
  return id;
}

function validateReport(report) {
  if (report?.schemaVersion !== REPORT_SCHEMA) throw new Error('unsupported evaluation report schema');
  if (report?.baseline?.compatibility?.compatible !== true) throw new Error('incompatible corpus report cannot enter Learning Intake');
  if (!/^[0-9a-f]{7,64}$/i.test(String(report?.evaluatedCommitSha || ''))) throw new Error('evaluated commit provenance is missing');
  if (!report?.generatedAt || Number.isNaN(Date.parse(report.generatedAt))) throw new Error('evaluation report timestamp provenance is missing');
  if (!Array.isArray(report?.cases)) throw new Error('evaluation report cases are missing');
  return report;
}

function failureClass(caseResult) {
  const value = String(caseResult?.failureClass || '').trim();
  return value && value.toLowerCase() !== 'unknown'
    ? { status: 'known', value }
    : { status: 'unclassified', value: 'unclassified' };
}

function buildEvidence({ report, reportFile, observationId, caseResult }) {
  if (caseResult?.matchedExpected !== false) throw new Error(`case ${caseResult?.caseId || '(unknown)'} is not an evaluation failure`);
  if (!caseResult?.caseId) throw new Error('evaluation failure case provenance is missing');
  if (!/^[0-9a-f]{16,64}$/i.test(String(caseResult?.failureSignature || ''))) {
    throw new Error(`evaluation failure signature is missing for ${caseResult.caseId}`);
  }
  if (!String(caseResult?.diagnostic || '').trim()) throw new Error(`evaluation failure diagnostic is missing for ${caseResult.caseId}`);

  const classified = failureClass(caseResult);
  const clusterIdentity = JSON.stringify({
    failureClass: classified.value,
    failureSignature: caseResult.failureSignature,
    expectedCaseResult: caseResult.expectedCaseResult,
    actualCaseResult: caseResult.actualCaseResult
  });
  const clusterKey = `evaluation-cluster-${stableKey(clusterIdentity)}`;
  const id = `evaluation-failure-${stableKey(`${observationId}:${caseResult.caseId}:${caseResult.failureSignature}`)}`;
  const evidenceFile = path.join(EVIDENCE_DIR, `${id}.json`);

  return {
    schemaVersion: EVALUATION_FAILURE_EVIDENCE_SCHEMA,
    id,
    eventKind: 'evaluation-failure',
    observationId,
    clusterKey,
    createdAt: report.generatedAt || null,
    evidenceRef: repoRelative(evidenceFile),
    reportRef: repoRelative(reportFile),
    evaluation: {
      reportSchemaVersion: report.schemaVersion,
      evaluatedCommitSha: report.evaluatedCommitSha,
      baselineId: report.baseline?.baselineId || null,
      baselineCommitSha: report.baseline?.evaluatedCommitSha || null,
      baselineCompatible: true
    },
    case: {
      caseId: caseResult.caseId,
      population: caseResult.population || null,
      parentSeedId: caseResult.parentSeedId || null,
      domain: caseResult.domain || null,
      failureClass: classified.value,
      varianceFamily: caseResult.varianceFamily || null,
      severity: caseResult.severity || null,
      sourceKind: caseResult.sourceKind || null,
      script: caseResult.script || null,
      expectedCaseResult: caseResult.expectedCaseResult,
      actualCaseResult: caseResult.actualCaseResult
    },
    failureSignature: caseResult.failureSignature,
    diagnostic: caseResult.diagnostic,
    classification: {
      status: classified.status,
      failureClass: classified.value,
      origin: 'evaluation',
      cause: 'unresolved',
      productionFailure: false,
      verifierInfrastructureFailure: false,
      fixtureCauseInferred: false,
      flakeStatus: 'unconfirmed'
    },
    reproducibility: {
      status: 'unconfirmed',
      policy: 'separate-observation-required-before-candidate'
    },
    authority: {
      may: ['aggregate', 'classify', 'analyze', 'propose-inactive-candidate-after-reproduction'],
      mustNot: ['validate-candidate', 'activate-candidate', 'promote-candidate', 'edit-production', 'weaken-gates', 'start-paid-work']
    }
  };
}

function persistExactEvidence(evidence) {
  const file = path.join(ROOT, evidence.evidenceRef);
  const existing = readJson(file, null);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(evidence)) throw new Error(`conflicting evaluation failure evidence: ${evidence.id}`);
    return { evidence: existing, created: false };
  }
  writeJson(file, evidence);
  return { evidence, created: true };
}

export function intakeEvaluationFailures({ reportPath, observationId } = {}) {
  const reportFile = safeRepoJsonPath(reportPath);
  const observation = assertObservationId(observationId);
  const report = validateReport(JSON.parse(fs.readFileSync(reportFile, 'utf8')));
  const mismatches = report.cases.filter((caseResult) => caseResult?.matchedExpected === false);
  const persisted = mismatches.map((caseResult) => persistExactEvidence(buildEvidence({
    report,
    reportFile,
    observationId: observation,
    caseResult
  })));

  const receipts = persisted.map(({ evidence }) => orchestrateControlledLearning({
    eventKind: 'evaluation-failure',
    eventId: evidence.id
  }));

  return {
    schemaVersion: 'evaluation-failure-intake-result-v1',
    observationId: observation,
    evaluatedCommitSha: report.evaluatedCommitSha,
    mismatches: mismatches.length,
    evidenceCreated: persisted.filter((item) => item.created).length,
    evidenceIds: persisted.map((item) => item.evidence.id),
    receipts: receipts.map((receipt) => ({
      eventId: receipt.eventId,
      triggerAllowed: receipt.triggerAllowed,
      triggerReasons: receipt.triggerReasons,
      reproducibilityStatus: receipt.reproducibilityStatus,
      candidateId: receipt.candidateId,
      candidateActive: receipt.candidateActive,
      canValidate: receipt.canValidate,
      canActivate: receipt.canActivate
    }))
  };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let reportPath = null;
  let observationId = process.env.GF_EVALUATION_OBSERVATION_ID || null;
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i + 1]) throw new Error('usage: node factory/src/evaluation/intake-failures.mjs --report <repo-relative-json> --observation-id <id>');
    if (args[i] === '--report') reportPath = args[i + 1];
    else if (args[i] === '--observation-id') observationId = args[i + 1];
    else throw new Error(`unsupported argument: ${args[i]}`);
  }
  if (!reportPath || !observationId) throw new Error('usage: node factory/src/evaluation/intake-failures.mjs --report <repo-relative-json> --observation-id <id>');
  return { reportPath, observationId };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(intakeEvaluationFailures(parseArgs(process.argv))));
  } catch (error) {
    console.error(`S3 EVALUATION FAILURE INTAKE ERROR: ${error?.message || error}`);
    process.exit(2);
  }
}
