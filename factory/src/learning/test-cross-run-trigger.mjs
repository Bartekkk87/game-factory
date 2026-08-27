import assert from 'node:assert/strict';
import { aggregateEvidence } from './aggregate.mjs';
import { evaluateImprovementTrigger } from './trigger.mjs';

// Event-causal thresholding: recurrence may only affect the production event that actually participates in it.
const sameRun = aggregateEvidence({
  runEvidence: [
    { runId: 'run-1', events: [{ failureSignature: 'E1' }, { failureSignature: 'E1' }] },
    { runId: 'run-2' }
  ]
});
assert.equal(sameRun.failures.recurring[0]?.count, 2);
assert.equal(sameRun.failures.recurring[0]?.runCount, 1);
assert.deepEqual(sameRun.failures.recurring[0]?.runIds, ['run-1']);
const sameRunTrigger = evaluateImprovementTrigger(sameRun, { eventKind: 'production-run', eventId: 'run-1' });
assert.equal(sameRunTrigger.allowed, false);
assert.deepEqual(sameRunTrigger.allowedScopes, []);

const crossRun = aggregateEvidence({
  runEvidence: [
    { runId: 'run-1', events: [{ failureSignature: 'E1' }] },
    { runId: 'run-2', events: [{ failureSignature: 'E1' }] }
  ]
});
assert.equal(crossRun.failures.recurring[0]?.count, 2);
assert.equal(crossRun.failures.recurring[0]?.runCount, 2);
assert.deepEqual(crossRun.failures.recurring[0]?.runIds, ['run-1', 'run-2']);
const crossRunTrigger = evaluateImprovementTrigger(crossRun, { eventKind: 'production-run', eventId: 'run-2' });
assert.equal(crossRunTrigger.allowed, true);
assert.deepEqual(crossRunTrigger.allowedScopes, ['engineering']);

const staleHistorical = aggregateEvidence({
  runEvidence: [
    { runId: 'run-1', events: [{ failureSignature: 'E1' }] },
    { runId: 'run-2', events: [{ failureSignature: 'E1' }] },
    { runId: 'run-3' }
  ]
});
const unrelatedCurrentRun = evaluateImprovementTrigger(staleHistorical, { eventKind: 'production-run', eventId: 'run-3' });
assert.equal(unrelatedCurrentRun.allowed, false);
assert.deepEqual(unrelatedCurrentRun.reasons, []);

const attemptCrossRun = aggregateEvidence({
  runEvidence: [{ runId: 'run-1' }, { runId: 'run-2' }],
  attemptEvidence: [
    { runId: 'run-1', attemptId: 'attempt-01', kind: 'technical', evidence: { pass: false, failures: [{ errorCode: 'runtime-E2' }] } },
    { runId: 'run-2', attemptId: 'attempt-01', kind: 'technical', evidence: { pass: false, failures: [{ errorCode: 'runtime-E2' }] } }
  ]
});
assert.equal(attemptCrossRun.failures.recurring[0]?.runCount, 2);
assert.deepEqual(attemptCrossRun.failures.recurring[0]?.runIds, ['run-1', 'run-2']);
assert.equal(evaluateImprovementTrigger(attemptCrossRun, { eventKind: 'production-run', eventId: 'run-2' }).allowed, true);

const distinctTechnicalChecks = aggregateEvidence({
  attemptEvidence: [
    { runId: 'run-1', attemptId: 'attempt-01', kind: 'technical', evidence: { pass: false, failures: [{ id: 'interactivity', detail: 'failed' }] } },
    { runId: 'run-2', attemptId: 'attempt-01', kind: 'technical', evidence: { pass: false, failures: [{ id: 'assets_ok', detail: 'failed' }] } }
  ]
});
assert.equal(distinctTechnicalChecks.failures.recurring.length, 0);
assert.equal(distinctTechnicalChecks.failures.signatures['technical:interactivity:failed'], 1);
assert.equal(distinctTechnicalChecks.failures.signatures['technical:assets_ok:failed'], 1);

const ownerNegative = aggregateEvidence({
  runEvidence: [
    { runId: 'run-1', events: [{ failureSignature: 'E1' }] },
    { runId: 'run-2', events: [{ failureSignature: 'E1' }] }
  ],
  ownerFeedback: [{ id: 'feedback-1', parsedCommand: 'reject' }]
});
const ownerTrigger = evaluateImprovementTrigger(ownerNegative, { eventKind: 'owner-feedback', eventId: 'feedback-1', eventVerdict: 'reject' });
assert.equal(ownerTrigger.allowed, true);
assert.deepEqual(ownerTrigger.allowedScopes, ['product-feedback']);
assert.deepEqual(ownerTrigger.reasons, ['owner-negative-or-feedback-evidence']);

const ownerApprove = evaluateImprovementTrigger(ownerNegative, { eventKind: 'owner-feedback', eventId: 'feedback-2', eventVerdict: 'approve' });
assert.equal(ownerApprove.allowed, false);
assert.deepEqual(ownerApprove.allowedScopes, []);

console.log('cross-run learning trigger selftest: PASS');
