import assert from 'node:assert/strict';
import { isDefinitelyPreDeliveryTransportError, llmFailureReason, requestTimeoutMsForRoute } from './client.mjs';
import { getModelRecord } from './model-registry.mjs';

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

assert.equal(requestTimeoutMsForRoute({ provider: { id: 'openai' }, model: {} }), 180000);
assert.equal(requestTimeoutMsForRoute({ provider: { id: 'openrouter' }, model: {} }), 360000);
assert.equal(requestTimeoutMsForRoute({
  provider: { id: 'openrouter' },
  model: getModelRecord('openrouter', 'nvidia/nemotron-3.5-lightning:free')
}), 360000);
assert.equal(requestTimeoutMsForRoute({
  provider: { id: 'openrouter' },
  model: getModelRecord('openrouter', 'nvidia/nemotron-3-ultra-550b-a55b:free')
}), 900000);

console.log('LLM transport retry + failure classification selftest: PASS');
