// Compatibility facade only.
//
// Automatic analysis/orchestration must import proposal-capability.mjs directly.
// Human-gated validation/promotion/application code must import
// privileged-lifecycle.mjs directly. Keeping this facade preserves older callers
// while the capability-boundary selftest prevents automatic paths from using it.

export {
  LEARNING_CANDIDATE_SCHEMA as LEARNING_SCHEMA,
  assertCandidate,
  readCandidate,
  createCandidateProposal as createCandidate
} from './proposal-capability.mjs';

export {
  APPLICATION_RECEIPT_SCHEMA,
  APPLICATION_REGRESSION_EVIDENCE_SCHEMA,
  APPLICATION_TERMINAL_STATE,
  PROTECTED_LAYERS,
  LESSON_PROMOTION_TARGET_LAYER,
  validateCandidate,
  promoteCandidate,
  deactivateCandidate,
  recordApplicationReceipt,
  PRIVILEGED_LIFECYCLE_CAPABILITY
} from './privileged-lifecycle.mjs';
