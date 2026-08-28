export {
  APPLICATION_RECEIPT_SCHEMA,
  APPLICATION_REGRESSION_EVIDENCE_SCHEMA,
  APPLICATION_TERMINAL_STATE,
  PROTECTED_LAYERS,
  LESSON_PROMOTION_TARGET_LAYER,
  validateCandidate,
  promoteCandidate,
  deactivateCandidate,
  recordApplicationReceipt
} from './lifecycle.mjs';

export const PRIVILEGED_LIFECYCLE_CAPABILITY = Object.freeze({
  may: Object.freeze(['validate-candidate', 'promote-candidate', 'deactivate-candidate', 'close-application-receipt']),
  mustNot: Object.freeze(['automatic-analysis', 'automatic-trigger', 'start-paid-work'])
});
