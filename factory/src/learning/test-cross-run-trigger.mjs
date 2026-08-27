import assert from 'node:assert/strict';
import { aggregateEvidence } from './aggregate.mjs';
import { evaluateImprovementTrigger } from './trigger.mjs';

const sameRun = aggregateEvidence({
  runEvidence: [
    { runId: 'run-1', events: [{ failureSignature: 'E1' }, { failureSignature: 'E1' }] },
    { runId: 'run-2' }
  ]
});
assert.equal(sameRun.failures.recurring[0]?.count, 2);
assert.equal(sameRun.failures.recurring[0]?.runCount, 1);
const sameRunTrigger = evaluateImprovementTrigger(sameRun);
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
const crossRunTrigger = evaluateImprovementTrigger(crossRun);
assert.equal(crossRunTrigger.allowed, true);
assert.deepEqual(crossRunTrigger.allowedScopes, ['engineering']);

const attemptCrossRun = aggregateEvidence({
  runEvidence: [{ runId: 'run-1' }, { runId: 'run-2' }],
  attemptEvidence: [
    { runId: 'run-1', attemptId: 'attempt-01', kind: 'technical', evidence: { pass: false, failures: [{ errorCode: 'runtime-E2' }] } },
    { runId: 'run-2', attemptId: 'attempt-01', kind: 'technical', evidence: { pass: false, failures: [{ errorCode: 'runtime-E2' }] } }
  ]
});
assert.equal(attemptCrossRun.failures.recurring[0]?.runCount, 2);
assert.equal(evaluateImprovementTrigger(attemptCrossRun).allowed, true);

const ownerNegative = aggregateEvidence({
  runEvidence: [{ runId: 'run-1' }],
  ownerFeedback: [{ id: 'feedback-1', parsedCommand: 'reject' }]
});
const ownerTrigger = evaluateImprovementTrigger(ownerNegative);
assert.equal(ownerTrigger.allowed, true);
assert.deepEqual(ownerTrigger.allowedScopes, ['product-feedback']);

console.log('cross-run learning trigger selftest: PASS');
