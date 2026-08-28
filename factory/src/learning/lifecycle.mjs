import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../config.mjs';
import { readJson, sha256, writeJson } from '../util/fsx.mjs';
import { loadMemory, saveMemory } from '../memory/store.mjs';

export const LEARNING_SCHEMA = 'learning-candidate-v1';
export const APPLICATION_RECEIPT_SCHEMA = 'learning-application-receipt-v1';
export const APPLICATION_REGRESSION_EVIDENCE_SCHEMA = 'learning-application-regression-evidence-v1';
export const APPLICATION_TERMINAL_STATE = 'APPLIED-CLOSED';
export const PROTECTED_LAYERS = Object.freeze(new Set([
  'skill',
  'prompt',
  'owner-contract',
  'verifier',
  'product-fidelity',
  'release-gate',
  'engine-contract',
  'control-plane',
  'evaluation'
]));
export const LESSON_PROMOTION_TARGET_LAYER = 'prompt';

const DIRS = Object.freeze({
  candidates: path.join(ROOT, 'learning', 'candidates'),
  validations: path.join(ROOT, 'learning', 'validations'),
  promotions: path.join(ROOT, 'learning', 'promotions'),
  applications: path.join(ROOT, 'learning', 'applications')
});

const candidatePath = (id) => path.join(DIRS.candidates, `${id}.json`);
const validationPath = (id) => path.join(DIRS.validations, `${id}.json`);
const applicationPath = (id) => path.join(DIRS.applications, `${id}.json`);

export function assertCandidate(candidate) {
  for (const key of ['id', 'status', 'role', 'scope', 'targetLayer', 'text', 'sourceKind', 'createdAt']) {
    if (!candidate?.[key]) throw new Error(`learning candidate missing ${key}`);
  }
  if (!Array.isArray(candidate.sourceRunIds)) throw new Error('learning candidate sourceRunIds must be an array');
  if (candidate.sourceEvaluationFailureIds !== undefined && !Array.isArray(candidate.sourceEvaluationFailureIds)) {
    throw new Error('learning candidate sourceEvaluationFailureIds must be an array');
  }
  if (!candidate.sourceRunIds.length && !(candidate.sourceEvaluationFailureIds || []).length) {
    throw new Error('learning candidate requires run or evaluation-failure provenance');
  }
  if (!Array.isArray(candidate.ownerFeedbackIds)) throw new Error('learning candidate ownerFeedbackIds must be an array');
  if (candidate.active === true && candidate.status !== 'validated') throw new Error('only validated candidates may be active');
  return candidate;
}

export function createCandidate(input) {
  const candidate = assertCandidate({
    schemaVersion: LEARNING_SCHEMA,
    id: input.id,
    status: 'candidate',
    role: input.role,
    scope: input.scope,
    targetLayer: input.targetLayer,
    text: input.text,
    sourceRunIds: [...new Set(input.sourceRunIds || [])].map(String).sort(),
    sourceEvaluationFailureIds: [...new Set(input.sourceEvaluationFailureIds || [])].map(String).sort(),
    sourceKind: input.sourceKind,
    ownerFeedbackIds: [...new Set(input.ownerFeedbackIds || [])].map(String).sort(),
    candidateSha: input.candidateSha || null,
    confidence: Number.isFinite(Number(input.confidence)) ? Number(input.confidence) : null,
    evidenceCount: Number.isFinite(Number(input.evidenceCount)) ? Number(input.evidenceCount) : 0,
    createdAt: input.createdAt || new Date().toISOString(),
    validatedAt: null,
    expiresAfter: input.expiresAfter || null,
    supersedes: input.supersedes || null,
    validationEvidence: [],
    regressionResults: [],
    active: false,
    activatedAt: null,
    promotionRef: null,
    deactivatedAt: null,
    deactivatedBy: null,
    rollbackOf: null,
    reversalReason: null
  });
  if (readJson(candidatePath(candidate.id), null)) throw new Error(`candidate already exists: ${candidate.id}`);
  writeJson(candidatePath(candidate.id), candidate);
  return candidate;
}

export function validateCandidate(id, { validationEvidence, regressionResults, validatedAt = null }) {
  const candidate = assertCandidate(readJson(candidatePath(id), null));
  if (candidate.status !== 'candidate') throw new Error(`candidate ${id} is not pending validation`);
  if (!Array.isArray(validationEvidence) || !validationEvidence.length) throw new Error('validationEvidence is required');
  if (!Array.isArray(regressionResults) || !regressionResults.length || regressionResults.some((result) => result?.passed !== true)) {
    throw new Error('all regression results must pass');
  }
  const next = {
    ...candidate,
    status: 'validated',
    validatedAt: validatedAt || new Date().toISOString(),
    validationEvidence,
    regressionResults,
    active: false
  };
  writeJson(candidatePath(id), next);
  writeJson(validationPath(id), {
    schemaVersion: 'learning-validation-v1',
    candidateId: id,
    validatedAt: next.validatedAt,
    validationEvidence,
    regressionResults,
    outcome: 'validated-inactive'
  });
  return next;
}

function fileSha256(file) {
  return sha256(fs.readFileSync(file));
}

function assertMergedImplementationCommit(commitSha) {
  const value = String(commitSha || '').trim().toLowerCase();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value)) throw new Error('mergeCommitSha must be a full Git commit SHA');
  const exists = spawnSync('git', ['cat-file', '-e', `${value}^{commit}`], { cwd: ROOT, encoding: 'utf8' });
  if (exists.status !== 0) throw new Error(`merge commit is unknown: ${value}`);
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', value, 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (ancestor.status !== 0) throw new Error(`merge commit is not merged into current HEAD: ${value}`);
  return value;
}

function assertPrRef(value) {
  const ref = String(value || '').trim();
  if (!/^#\d+$/.test(ref) && !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(ref)) {
    throw new Error('prRef must identify a GitHub pull request');
  }
  return ref;
}

function assertCandidateArtifactInCommit(file, commitSha, expectedSha256) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (!relative || relative.startsWith('../')) throw new Error('candidate artifact path escapes repository');
  const fromCommit = spawnSync('git', ['show', `${commitSha}:${relative}`], {
    cwd: ROOT,
    encoding: null,
    maxBuffer: 4 * 1024 * 1024
  });
  if (fromCommit.status !== 0) throw new Error(`merge commit does not contain candidate artifact: ${relative}`);
  const commitSha256 = sha256(fromCommit.stdout);
  if (commitSha256 !== expectedSha256) {
    throw new Error('merge commit contains a different candidate artifact');
  }
  return { ref: relative, sha256: commitSha256 };
}

export function promoteCandidate(id, {
  approvedBy,
  approvalKind,
  promotionRef,
  mergeCommitSha,
  candidateArtifactSha256,
  activatedAt = null
}) {
  const file = candidatePath(id);
  const candidate = assertCandidate(readJson(file, null));
  if (candidate.status !== 'validated' || candidate.active) {
    throw new Error(`candidate ${id} must be validated and inactive`);
  }
  if (!approvedBy || !promotionRef || !mergeCommitSha || !candidateArtifactSha256) {
    throw new Error('promotion requires approvedBy, promotionRef, mergeCommitSha and candidateArtifactSha256');
  }
  if (candidate.targetLayer !== LESSON_PROMOTION_TARGET_LAYER) {
    throw new Error(`candidate ${id} targets ${candidate.targetLayer}; lesson promotion only supports targetLayer ${LESSON_PROMOTION_TARGET_LAYER}`);
  }
  if (PROTECTED_LAYERS.has(candidate.targetLayer) && approvalKind !== 'human-merge') {
    throw new Error(`protected layer ${candidate.targetLayer} requires human-merge promotion`);
  }

  const expectedCandidateSha = String(candidateArtifactSha256 || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedCandidateSha)) throw new Error('promotion candidateArtifactSha256 must be SHA-256');
  const actualCandidateSha = fileSha256(file);
  if (actualCandidateSha !== expectedCandidateSha) throw new Error(`candidate ${id} artifact sha256 mismatch`);

  const verifiedPrRef = assertPrRef(promotionRef);
  const verifiedMergeCommit = assertMergedImplementationCommit(mergeCommitSha);
  const candidateBinding = assertCandidateArtifactInCommit(file, verifiedMergeCommit, actualCandidateSha);
  const at = activatedAt || new Date().toISOString();

  writeJson(path.join(DIRS.promotions, `${id}.json`), {
    schemaVersion: 'learning-promotion-v2',
    candidateId: id,
    candidateArtifact: candidateBinding,
    approvedBy,
    approvalKind,
    promotionRef: verifiedPrRef,
    mergeCommitSha: verifiedMergeCommit,
    activatedAt: at,
    reversible: true
  });

  const next = { ...candidate, active: true, activatedAt: at, promotionRef: verifiedPrRef };
  writeJson(file, next);

  const memory = loadMemory();
  if (!memory.lessons.some((lesson) => lesson.id === id)) {
    memory.lessons.push({
      id,
      date: at.slice(0, 10),
      role: candidate.role,
      text: candidate.text,
      status: 'validated',
      active: true,
      sourceKind: candidate.sourceKind,
      sourceRunIds: candidate.sourceRunIds,
      ownerFeedbackIds: candidate.ownerFeedbackIds,
      targetLayer: candidate.targetLayer,
      promotionRef: verifiedPrRef,
      mergeCommitSha: verifiedMergeCommit,
      candidateArtifactSha256: actualCandidateSha
    });
    saveMemory(memory);
  }
  return next;
}

export function deactivateCandidate(id, { by, reason, rollbackOf = null, at = null }) {
  const candidate = assertCandidate(readJson(candidatePath(id), null));
  const when = at || new Date().toISOString();
  const next = {
    ...candidate,
    active: false,
    deactivatedAt: when,
    deactivatedBy: by || null,
    rollbackOf: rollbackOf || candidate.rollbackOf || null,
    reversalReason: reason || null
  };
  writeJson(candidatePath(id), next);
  const memory = loadMemory();
  memory.lessons = memory.lessons.map((lesson) => lesson.id === id
    ? { ...lesson, active: false, deactivatedAt: when, reversalReason: reason || null }
    : lesson);
  saveMemory(memory);
  return next;
}

function normalizeRepoJsonRef(ref, label) {
  const value = String(ref || '').trim().replaceAll('\\', '/');
  if (!value || path.isAbsolute(value) || value.split('/').includes('..') || !value.endsWith('.json')) {
    throw new Error(`${label} must be a safe repo-relative JSON ref`);
  }
  const absolute = path.resolve(ROOT, value);
  if (!absolute.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error(`${label} not found: ${value}`);
  }
  return { ref: value, absolute };
}

function bindEvidence(input, label) {
  const { ref, absolute } = normalizeRepoJsonRef(input?.ref, label);
  const expectedSha = String(input?.sha256 || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedSha)) throw new Error(`${label} requires sha256`);
  const actualSha = fileSha256(absolute);
  if (actualSha !== expectedSha) throw new Error(`${label} sha256 mismatch`);
  return { ref, sha256: actualSha };
}

function assertAppliedAt(value) {
  const appliedAt = String(value || '').trim();
  if (!appliedAt || Number.isNaN(Date.parse(appliedAt))) throw new Error('application appliedAt must be an ISO timestamp');
  return appliedAt;
}

function findApplicationReceipt(receiptId) {
  if (!receiptId || !fs.existsSync(DIRS.applications)) return null;
  for (const entry of fs.readdirSync(DIRS.applications, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const file = path.join(DIRS.applications, entry.name);
    const receipt = readJson(file, null);
    if (receipt?.receiptId === receiptId) return { receipt, file };
  }
  return null;
}

function assertApplicationRegressionEvidence(binding, mergeCommitSha, candidateId) {
  const evidence = readJson(path.resolve(ROOT, binding.ref), null);
  if (evidence?.schemaVersion !== APPLICATION_REGRESSION_EVIDENCE_SCHEMA) {
    throw new Error('application regression evidence schema is invalid');
  }
  if (evidence?.candidateId !== candidateId) throw new Error('application regression evidence candidate mismatch');
  if (String(evidence?.evaluatedCommitSha || '').toLowerCase() !== mergeCommitSha) {
    throw new Error('application regression evidence evaluated a different commit');
  }
  if (evidence?.outcome !== 'PASS') throw new Error('application regression evidence outcome must be PASS');
  if (!String(evidence?.kind || '').trim()) throw new Error('application regression evidence kind is required');
  if (!String(evidence?.sourceRef || '').trim()) throw new Error('application regression evidence sourceRef is required');
  return {
    ...binding,
    kind: evidence.kind,
    sourceRef: evidence.sourceRef,
    evaluatedCommitSha: evidence.evaluatedCommitSha,
    outcome: 'PASS'
  };
}

function assertCorpusReport(binding, mergeCommitSha) {
  const report = readJson(path.resolve(ROOT, binding.ref), null);
  if (report?.schemaVersion !== 'game-factory.golden-corpus-evaluation-report/v1') {
    throw new Error('application corpus report schema is invalid');
  }
  if (String(report.evaluatedCommitSha || '').toLowerCase() !== mergeCommitSha) {
    throw new Error('application corpus report evaluated a different commit');
  }
  if (report?.baseline?.compatibility?.compatible !== true) throw new Error('application corpus baseline is incompatible');
  if (report?.policy?.corpusRegression !== false) throw new Error('application corpus regression must be false');
  if (report?.policy?.criticalFalsePassRegression !== false) throw new Error('application critical false-pass regression must be false');
  if (Number(report?.metrics?.expectedMismatchCount) !== 0) throw new Error('application corpus expected mismatches must be zero');
  if (Number(report?.metrics?.criticalFalsePassCount) !== 0) throw new Error('application corpus critical false PASS count must be zero');
  return report;
}

export function recordApplicationReceipt(id, {
  candidateArtifactSha256,
  changeScope,
  prRef,
  mergeCommitSha,
  humanApprovalRef,
  regressionEvidence,
  corpusEvidence,
  appliedAt,
  supersedesReceiptId = null,
  reversalOfReceiptId = null
} = {}) {
  const candidateFile = candidatePath(id);
  const candidate = assertCandidate(readJson(candidateFile, null));
  if (candidate.status !== 'validated' || candidate.active !== false) {
    throw new Error(`candidate ${id} must be validated and inactive before application closure`);
  }
  if (!PROTECTED_LAYERS.has(candidate.targetLayer) || candidate.targetLayer === LESSON_PROMOTION_TARGET_LAYER) {
    throw new Error(`candidate ${id} targetLayer ${candidate.targetLayer} is not an S4 non-prompt protected layer`);
  }

  const expectedCandidateSha = String(candidateArtifactSha256 || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedCandidateSha)) throw new Error('application candidateArtifactSha256 is required');
  const actualCandidateSha = fileSha256(candidateFile);
  if (actualCandidateSha !== expectedCandidateSha) throw new Error(`candidate ${id} artifact sha256 mismatch`);

  const scope = String(changeScope || '').trim();
  if (!scope) throw new Error('application changeScope is required');
  const implementationPrRef = assertPrRef(prRef);
  const implementationCommitSha = assertMergedImplementationCommit(mergeCommitSha);
  const approvalRef = String(humanApprovalRef || '').trim();
  if (!approvalRef) throw new Error('application humanApprovalRef is required');
  const when = assertAppliedAt(appliedAt);

  const validationFile = validationPath(id);
  if (!fs.existsSync(validationFile)) throw new Error(`candidate ${id} canonical validation artifact is missing`);
  const validation = readJson(validationFile, null);
  if (validation?.schemaVersion !== 'learning-validation-v1' || validation?.candidateId !== id || validation?.outcome !== 'validated-inactive') {
    throw new Error(`candidate ${id} canonical validation artifact is inconsistent`);
  }
  if (!Array.isArray(validation.validationEvidence) || !validation.validationEvidence.length) {
    throw new Error(`candidate ${id} validation evidence is missing`);
  }
  if (!Array.isArray(validation.regressionResults) || !validation.regressionResults.length || validation.regressionResults.some((result) => result?.passed !== true)) {
    throw new Error(`candidate ${id} canonical validation regression is not fully passing`);
  }
  const validationBinding = {
    ref: path.relative(ROOT, validationFile).split(path.sep).join('/'),
    sha256: fileSha256(validationFile)
  };

  if (!Array.isArray(regressionEvidence) || !regressionEvidence.length) throw new Error('application regressionEvidence is required');
  const regressionBindings = regressionEvidence.map((item, index) => {
    const binding = bindEvidence(item, `application regressionEvidence[${index}]`);
    return assertApplicationRegressionEvidence(binding, implementationCommitSha, id);
  });
  const corpusBinding = bindEvidence(corpusEvidence, 'application corpusEvidence');
  const corpus = assertCorpusReport(corpusBinding, implementationCommitSha);

  if (supersedesReceiptId && reversalOfReceiptId) {
    throw new Error('application receipt may supersede or reverse one prior receipt, not both');
  }
  const priorReceiptId = String(supersedesReceiptId || reversalOfReceiptId || '').trim() || null;
  if (priorReceiptId && !findApplicationReceipt(priorReceiptId)) {
    throw new Error(`application prior receipt not found: ${priorReceiptId}`);
  }

  const receipt = {
    schemaVersion: APPLICATION_RECEIPT_SCHEMA,
    receiptId: `application-${id}`,
    terminalState: APPLICATION_TERMINAL_STATE,
    candidateId: id,
    candidateArtifactSha256: actualCandidateSha,
    sourceCandidateSha: candidate.candidateSha || null,
    targetLayer: candidate.targetLayer,
    changeScope: scope,
    implementation: { prRef: implementationPrRef, mergeCommitSha: implementationCommitSha },
    humanApprovalRef: approvalRef,
    validationEvidence: validationBinding,
    regressionEvidence: regressionBindings,
    corpusEvidence: {
      ...corpusBinding,
      evaluatedCommitSha: corpus.evaluatedCommitSha,
      baselineId: corpus.baseline?.baselineId || null,
      outcome: 'PASS'
    },
    appliedAt: when,
    supersedesReceiptId: supersedesReceiptId || null,
    reversalOfReceiptId: reversalOfReceiptId || null
  };

  const file = applicationPath(id);
  const existing = readJson(file, null);
  if (existing) {
    if (JSON.stringify(existing) === JSON.stringify(receipt)) return { ...existing, created: false };
    throw new Error(`application receipt conflict for candidate ${id}; existing receipt is immutable`);
  }
  writeJson(file, receipt);
  return { ...receipt, created: true };
}
