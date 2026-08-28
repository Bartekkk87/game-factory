export const TRIGGER_POLICY_VERSION = 'controlled-improvement-trigger-v3';

function recurringFailureForEvent(recurringFailures, eventId) {
  return recurringFailures.some((x) => {
    const recurrent = Number(x.count) >= 2 && Number(x.runCount) >= 2;
    if (!recurrent) return false;
    if (!eventId) return true;
    return Array.isArray(x.runIds) && x.runIds.map(String).includes(String(eventId));
  });
}

export function evaluateImprovementTrigger(aggregate, context = {}) {
  const verdicts = aggregate?.owner?.verdicts || {};
  const recurringFailures = aggregate?.failures?.recurring || [];
  const eventKind = String(context?.eventKind || '').trim();
  const eventId = String(context?.eventId || '').trim();
  const eventVerdict = String(context?.eventVerdict || '').trim().toLowerCase();
  const eventFailed = context?.eventFailed === true;
  const evaluationFailure = context?.evaluationFailure || null;

  const aggregateFeedbackNegative = Number(verdicts.reject || 0) > 0 || Number(verdicts.feedback || 0) > 0;
  const feedbackNegative = eventKind === 'owner-feedback'
    ? ['reject', 'feedback'].includes(eventVerdict)
    : aggregateFeedbackNegative;
  const recurringEngineeringFailure = recurringFailureForEvent(
    recurringFailures,
    eventKind === 'production-run' ? eventId : ''
  );
  const evaluationCluster = eventKind === 'evaluation-failure' && evaluationFailure?.clusterKey
    ? aggregate?.evaluation?.clusters?.[evaluationFailure.clusterKey]
    : null;
  const repeatedEvaluationFailure = Number(evaluationCluster?.observationCount || 0) >= 2;

  const reasons = [], allowedScopes = [];
  if ((!eventKind || eventKind === 'owner-feedback') && feedbackNegative) {
    reasons.push('owner-negative-or-feedback-evidence');
    allowedScopes.push('product-feedback');
  }
  if (eventKind === 'production-run' && eventFailed) {
    reasons.push('failed-production-run-requires-case-root-cause');
    allowedScopes.push('case-root-cause');
  }
  if ((!eventKind || eventKind === 'production-run') && recurringEngineeringFailure) {
    reasons.push('recurring-engineering-failure-across-runs');
    allowedScopes.push('engineering');
  }
  if (eventKind === 'evaluation-failure') {
    reasons.push('evaluation-failure-requires-analysis');
    allowedScopes.push('evaluation-failure-analysis');
    if (repeatedEvaluationFailure) reasons.push('repeated-evaluation-failure-observation');
  }

  return {
    schemaVersion: 'learning-trigger-v1', policyVersion: TRIGGER_POLICY_VERSION,
    allowed: reasons.length > 0, reasons: reasons.sort(), allowedScopes: [...new Set(allowedScopes)].sort(),
    authority: 'analysis-only', canValidate: false, canActivate: false
  };
}
