import path from 'node:path';
import { ROOT } from '../config.mjs';
import { readJson, writeJson } from '../util/fsx.mjs';

export const LEARNING_CANDIDATE_SCHEMA = 'learning-candidate-v1';
const CANDIDATE_DIR = path.join(ROOT, 'learning', 'candidates');
const candidatePath = (id) => path.join(CANDIDATE_DIR, `${id}.json`);

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

export function readCandidate(id) {
  const candidate = readJson(candidatePath(String(id || '').trim()), null);
  return candidate ? assertCandidate(candidate) : null;
}

export function createCandidateProposal(input) {
  const candidate = assertCandidate({
    schemaVersion: LEARNING_CANDIDATE_SCHEMA,
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
  if (readCandidate(candidate.id)) throw new Error(`candidate already exists: ${candidate.id}`);
  writeJson(candidatePath(candidate.id), candidate);
  return candidate;
}

export const PROPOSAL_CAPABILITY = Object.freeze({
  may: Object.freeze(['read-candidate', 'create-inactive-candidate']),
  mustNot: Object.freeze(['validate-candidate', 'activate-candidate', 'promote-candidate', 'deactivate-candidate', 'close-application-receipt'])
});
