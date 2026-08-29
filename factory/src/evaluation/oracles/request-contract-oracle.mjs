import assert from 'node:assert/strict';
import { buildOpenAiCompatibleChatRequest } from '../../llm/adapters/openai-compatible-chat.mjs';
import { getModelRecord } from '../../llm/model-registry.mjs';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

function reasoningRequest() {
  const model = getModelRecord('openai', 'gpt-5.6-terra');
  const request = buildOpenAiCompatibleChatRequest({
    route: {
      provider: { id: 'openai', apiKey: 'test-key', baseUrl: 'https://example.invalid', chatPath: '/chat/completions' },
      model
    },
    system: 'system', user: 'user', json: true, temperature: 0.9, maxTokens: 321
  });
  return JSON.parse(request.body);
}

const caseId = caseIdFromArgs();
const body = reasoningRequest();
if (caseId === 'hr-provider-max-completion-token-contract') {
  assert.equal(body.max_completion_tokens, 321);
  assert.equal(Object.hasOwn(body, 'max_tokens'), false);
} else if (caseId === 'hr-provider-temperature-unsupported-contract') {
  assert.equal(Object.hasOwn(body, 'temperature'), false);
  assert.equal(body.max_completion_tokens, 321);
} else {
  throw new Error(`unsupported provider-request corpus case: ${caseId}`);
}

console.log(JSON.stringify({ caseId, observation: 'PASS' }));
