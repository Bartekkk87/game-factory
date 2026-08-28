import assert from 'node:assert/strict';
import { isDefinitelyPreDeliveryTransportError } from './client.mjs';

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

console.log('LLM transport retry policy selftest: PASS');
