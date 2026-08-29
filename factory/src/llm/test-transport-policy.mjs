import assert from 'node:assert/strict';
import { isDefinitelyPreDeliveryTransportError, llmFailureReason } from './client.mjs';

for (const code of ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'CERT_HAS_EXPIRED']) {
  assert.equal(isDefinitelyPreDeliveryTransportError({ name: 'TypeError', cause: { code } }), true, code);
}

for (const error of [
  { name: 'AbortError', cause: { code: 'ECONNREFUSED' } },
  { name: 'TypeError', cause: { code: 'ECONNRESET' } },
  { name: 'TypeError', cause: { code: 'ETIMEDOUT' } },
  { name: 'TypeError' }
]) {
  assert.equal(isDefinitelyPreDeliveryTransportError(error), false);
}

assert.equal(llmFailureReason({ code: 'REQUEST_TIMEOUT' }, 'engineer_invalid_output'), 'engineer_transport_timeout');
assert.equal(llmFailureReason({ code: 'REQUEST_TIMEOUT' }, 'engineer_polish_invalid'), 'engineer_transport_timeout');
assert.equal(llmFailureReason({ code: 'REQUEST_TIMEOUT' }, 'director_failed'), 'director_transport_timeout');
assert.equal(llmFailureReason({ code: 'REQUEST_TIMEOUT' }, 'playtester_failed'), 'playtester_transport_timeout');
assert.equal(llmFailureReason({ code: 'REQUEST_TIMEOUT' }, 'auditor_failed'), 'llm_transport_timeout');
assert.equal(llmFailureReason({ code: 'BUDGET_BLOCKED' }, 'engineer_invalid_output'), 'budget_blocked');
assert.equal(llmFailureReason(new Error('bad output'), 'engineer_invalid_output'), 'engineer_invalid_output');

console.log('LLM transport retry + failure classification selftest: PASS');
