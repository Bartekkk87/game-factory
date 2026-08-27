export const TRIGGER_POLICY_VERSION = 'controlled-improvement-trigger-v1';

export function evaluateImprovementTrigger(aggregate) {
  const verdicts = aggregate?.owner?.verdicts || {};
  const recurringFailures = aggregate?.failures?.recurring || [];
  const feedbackNegative = Number(verdicts.reject || 0) > 0 || Number(verdicts.feedback || 0) > 0;
  const recurringEngineeringFailure = recurringFailures.some((x) => Number(x.count) >= 2 && Number(x.runCount) >= 2);
  const independentRunCount = new Set(aggregate?.input?.runIds || []).size;
  const reasons = [], allowedScopes = [];
  if (feedbackNegative) { reasons.push('owner-negative-or-feedback-evidence'); allowedScopes.push('product-feedback'); }
  if (recurringEngineeringFailure && independentRunCount >= 2) { reasons.push('recurring-engineering-failure-across-runs'); allowedScopes.push('engineering'); }
  return {
    schemaVersion: 'learning-trigger-v1', policyVersion: TRIGGER_POLICY_VERSION,
    allowed: reasons.length > 0, reasons: reasons.sort(), allowedScopes: [...new Set(allowedScopes)].sort(),
    authority: 'analysis-only', canValidate: false, canActivate: false
  };
}
