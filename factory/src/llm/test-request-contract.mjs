import assert from 'node:assert/strict';
import { buildOpenAiCompatibleChatRequest } from './adapters/openai-compatible-chat.mjs';
import { modelRegistrySnapshot } from './model-registry.mjs';

const registry = modelRegistrySnapshot();
const entries = Object.entries(registry);
assert.ok(entries.length > 0, 'model registry must not be empty');

for (const [key, model] of entries) {
  const route = {
    provider: {
      id: model.provider,
      apiKey: 'test-key',
      baseUrl: 'https://example.invalid',
      chatPath: '/chat/completions',
      openRouterHeaders: model.provider === 'openrouter'
    },
    model
  };

  assert.ok(model.requestShape, `${key} requestShape missing`);
  assert.ok(['max_tokens', 'max_completion_tokens'].includes(model.requestShape.tokenParam), `${key} tokenParam invalid`);
  assert.ok(['free', 'unsupported'].includes(model.requestShape.temperature), `${key} temperature contract invalid`);
  assert.ok(['response_format', 'none'].includes(model.requestShape.jsonMode), `${key} jsonMode invalid`);
  assert.ok(String(model.requestShape.contractSource || '').trim(), `${key} request contract source missing`);

  const request = buildOpenAiCompatibleChatRequest({
    route,
    system: 'system',
    user: 'user',
    json: true,
    temperature: 0.9,
    maxTokens: 321
  });
  const body = JSON.parse(request.body);

  assert.equal(body.model, model.id, `${key} model id mismatch`);
  assert.equal(body[model.requestShape.tokenParam], 321, `${key} token field mismatch`);
  const alternateToken = model.requestShape.tokenParam === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
  assert.equal(Object.hasOwn(body, alternateToken), false, `${key} emitted forbidden alternate token field`);

  if (model.requestShape.temperature === 'unsupported') {
    assert.equal(Object.hasOwn(body, 'temperature'), false, `${key} emitted unsupported temperature`);
  } else {
    assert.equal(body.temperature, 0.9, `${key} temperature missing`);
  }

  if (model.requestShape.jsonMode === 'response_format') {
    assert.deepEqual(body.response_format, { type: 'json_object' }, `${key} JSON response contract mismatch`);
  } else {
    assert.equal(Object.hasOwn(body, 'response_format'), false, `${key} emitted unsupported response_format`);
  }

  if (model.requestShape.reasoningEffort) {
    assert.deepEqual(body.reasoning, {
      effort: model.requestShape.reasoningEffort,
      ...(model.requestShape.reasoningExclude === true ? { exclude: true } : {})
    }, `${key} reasoning request contract mismatch`);
  } else {
    assert.equal(Object.hasOwn(body, 'reasoning'), false, `${key} emitted unexpected reasoning contract`);
  }

  if (model.requestShape.providerSort) {
    assert.equal(model.provider, 'openrouter', `${key} provider routing contract must be OpenRouter-only`);
    assert.deepEqual(body.provider, {
      sort: model.requestShape.providerSort,
      ...(model.requestShape.providerRequireParameters === true ? { require_parameters: true } : {})
    }, `${key} OpenRouter provider routing contract mismatch`);
  } else {
    assert.equal(Object.hasOwn(body, 'provider'), false, `${key} emitted unexpected provider routing contract`);
  }
}

const glm = registry['openrouter:z-ai/glm-5.3-flash'];
const glmRequest = buildOpenAiCompatibleChatRequest({
  route: {
    provider: {
      id: 'openrouter',
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      chatPath: '/chat/completions',
      openRouterHeaders: true
    },
    model: glm
  },
  system: 'system',
  user: 'user',
  json: true,
  temperature: 0.3,
  maxTokens: 12000
});
const glmBody = JSON.parse(glmRequest.body);
assert.deepEqual(glmBody.reasoning, { effort: 'low', exclude: true });
assert.deepEqual(glmBody.provider, { sort: 'throughput', require_parameters: true });
assert.deepEqual(glmBody.response_format, { type: 'json_object' });

const fixtureModel = structuredClone(entries[0][1]);
delete fixtureModel.requestShape;
assert.throws(() => buildOpenAiCompatibleChatRequest({
  route: { provider: { id: fixtureModel.provider, apiKey: 'x', baseUrl: 'https://example.invalid' }, model: fixtureModel },
  system: 's',
  user: 'u',
  maxTokens: 10
}), /no valid request tokenParam contract/);

console.log(`model request contract selftest: PASS (${entries.length} registry entries)`);
