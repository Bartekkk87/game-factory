import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildOpenAiCompatibleChatRequest } from './adapters/openai-compatible-chat.mjs';
import { getModelRecord, getModelPricing } from './model-registry.mjs';
import { resolveRoleRoute, ModelCapabilityError } from './router.mjs';
import { UnknownProviderError } from './provider-registry.mjs';

const configSource = fs.readFileSync(new URL('../config.mjs', import.meta.url), 'utf8');
const routerSource = fs.readFileSync(new URL('./router.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(configSource, /export const LLM\b/);
assert.doesNotMatch(configSource, /roleModels\s*:/);
assert.match(routerSource, /const ROLE_DEFAULTS/);
assert.match(routerSource, /gpt-5\.6-terra/);
assert.match(routerSource, /gpt-5\.6-luna/);

const managed = [
  'GF_LLM_PROVIDER', 'GF_MODEL', 'GF_LLM_PROVIDER_DIRECTOR', 'GF_LLM_PROVIDER_ENGINEER', 'GF_LLM_PROVIDER_PLAYTESTER', 'GF_LLM_PROVIDER_AUDITOR',
  'GF_MODEL_DIRECTOR', 'GF_MODEL_ENGINEER', 'GF_MODEL_PLAYTESTER', 'GF_MODEL_AUDITOR', 'GF_LLM_PROVIDER_ENGINEER_REPAIR', 'GF_MODEL_ENGINEER_REPAIR'
];
const saved = Object.fromEntries(managed.map((k) => [k, process.env[k]]));
for (const key of managed) delete process.env[key];

try {
  const director = resolveRoleRoute({ role: 'director', operation: 'direct' });
  assert.equal(director.provider.id, 'openai');
  assert.equal(director.model.id, 'gpt-5.6-terra');

  // Canary #3 request-contract regression: GPT-5.6 reasoning routes use
  // max_completion_tokens and omit custom temperature sampling values.
  for (const modelId of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
    const route = { ...director, model: getModelRecord('openai', modelId) };
    const body = JSON.parse(buildOpenAiCompatibleChatRequest({
      route,
      system: 'system',
      user: 'user',
      json: true,
      temperature: 0.9,
      maxTokens: 321
    }).body);
    assert.equal(body.model, modelId);
    assert.equal(body.max_completion_tokens, 321);
    assert.equal(Object.hasOwn(body, 'max_tokens'), false);
    assert.equal(Object.hasOwn(body, 'temperature'), false);
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.deepEqual(body.messages.map((m) => m.role), ['system', 'user']);
  }

  const visionBody = JSON.parse(buildOpenAiCompatibleChatRequest({
    route: director,
    system: 'system',
    user: 'user',
    images: ['data:image/png;base64,AA=='],
    maxTokens: 321
  }).body);
  assert.equal(Array.isArray(visionBody.messages[1].content), true);
  assert.equal(visionBody.messages[1].content[1].type, 'image_url');
  assert.equal(visionBody.messages[1].content[1].image_url.url, 'data:image/png;base64,AA==');
  assert.throws(() => buildOpenAiCompatibleChatRequest({ route: director, system: 's', user: 'u', maxTokens: 128001 }), /exceeds model limit/);

  // Legacy OpenAI models retain their established sampling/token fields.
  const legacyOpenAiRoute = { ...director, model: getModelRecord('openai', 'gpt-4o') };
  const legacyBody = JSON.parse(buildOpenAiCompatibleChatRequest({
    route: legacyOpenAiRoute,
    system: 'system',
    user: 'user',
    temperature: 0.4,
    maxTokens: 321
  }).body);
  assert.equal(legacyBody.max_tokens, 321);
  assert.equal(Object.hasOwn(legacyBody, 'max_completion_tokens'), false);
  assert.equal(legacyBody.temperature, 0.4);
  assert.throws(() => buildOpenAiCompatibleChatRequest({ route: legacyOpenAiRoute, system: 's', user: 'u', temperature: 3 }), /Invalid temperature/);

  for (const operation of ['build', 'repair', 'rebuild', 'polish']) {
    const engineer = resolveRoleRoute({ role: 'engineer', operation });
    assert.equal(engineer.provider.id, 'openai');
    assert.equal(engineer.model.id, 'gpt-5.6-terra');
  }

  const playtester = resolveRoleRoute({ role: 'playtester', operation: 'playtest', requirements: { vision: true } });
  assert.equal(playtester.provider.id, 'openai');
  assert.equal(playtester.model.id, 'gpt-5.6-terra');

  const auditor = resolveRoleRoute({ role: 'auditor', operation: 'audit' });
  assert.equal(auditor.provider.id, 'openai');
  assert.equal(auditor.model.id, 'gpt-5.6-luna');

  assert.deepEqual(getModelPricing('openai', 'gpt-5.6-terra'), {
    inputUsdPerM: 2, cachedInputUsdPerM: 0.2, outputUsdPerM: 12,
    longContext: { inputThresholdTokens: 272000, inputMultiplier: 2, cachedInputMultiplier: 2, outputMultiplier: 1.5 },
    source: 'openai-official-2026-08-27'
  });

  const flash = getModelRecord('deepseek', 'deepseek-v4-flash');
  assert.equal(flash.benchmarkStatus, 'candidate');
  assert.equal(flash.productionDefault, false);
  assert.equal(flash.versionLabel, 'DeepSeek-V4-Flash-0731');
  assert.equal(flash.capabilities.vision, false);

  process.env.GF_LLM_PROVIDER = 'deepseek';
  const deepseekRoute = resolveRoleRoute({ role: 'engineer' });
  assert.equal(deepseekRoute.model.id, 'deepseek-v4-flash');
  const deepseekBody = JSON.parse(buildOpenAiCompatibleChatRequest({
    route: deepseekRoute,
    system: 'system',
    user: 'user',
    temperature: 0.4,
    maxTokens: 321
  }).body);
  assert.equal(deepseekBody.max_tokens, 321);
  assert.equal(Object.hasOwn(deepseekBody, 'max_completion_tokens'), false);
  assert.equal(deepseekBody.temperature, 0.4);
  assert.throws(() => buildOpenAiCompatibleChatRequest({
    route: deepseekRoute,
    system: 'system',
    user: 'user',
    images: ['data:image/png;base64,AA==']
  }), /does not support vision/);
  assert.throws(() => resolveRoleRoute({ role: 'playtester', requirements: { vision: true } }), ModelCapabilityError);

  process.env.GF_LLM_PROVIDER = 'definitely-not-a-provider';
  assert.throws(() => resolveRoleRoute({ role: 'engineer' }), UnknownProviderError);

  delete process.env.GF_LLM_PROVIDER;
  process.env.GF_LLM_PROVIDER_ENGINEER = 'deepseek';
  process.env.GF_MODEL_ENGINEER = 'deepseek-v4-pro';
  assert.equal(resolveRoleRoute({ role: 'engineer' }).provider.id, 'deepseek');
  assert.equal(resolveRoleRoute({ role: 'engineer' }).model.id, 'deepseek-v4-pro');
  assert.equal(resolveRoleRoute({ role: 'director' }).provider.id, 'openai');

  console.log('model/provider router selftest: PASS');
} finally {
  for (const key of managed) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
}
