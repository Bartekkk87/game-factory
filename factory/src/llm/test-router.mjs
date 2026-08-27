import assert from 'node:assert/strict';
import { getModelRecord, getModelPricing } from './model-registry.mjs';
import { resolveRoleRoute, ModelCapabilityError } from './router.mjs';
import { UnknownProviderError } from './provider-registry.mjs';

const managed = [
  'GF_LLM_PROVIDER', 'GF_MODEL', 'GF_LLM_PROVIDER_DIRECTOR', 'GF_LLM_PROVIDER_ENGINEER', 'GF_LLM_PROVIDER_PLAYTESTER', 'GF_LLM_PROVIDER_AUDITOR',
  'GF_MODEL_DIRECTOR', 'GF_MODEL_ENGINEER', 'GF_MODEL_PLAYTESTER', 'GF_MODEL_AUDITOR', 'GF_LLM_PROVIDER_ENGINEER_REPAIR', 'GF_MODEL_ENGINEER_REPAIR'
];
const saved = Object.fromEntries(managed.map((k) => [k, process.env[k]]));
for (const key of managed) delete process.env[key];

try {
  assert.equal(resolveRoleRoute({ role: 'director' }).model.id, 'gpt-5.6-terra');
  assert.equal(resolveRoleRoute({ role: 'engineer', operation: 'repair' }).model.id, 'gpt-5.6-terra');
  assert.equal(resolveRoleRoute({ role: 'playtester', requirements: { vision: true } }).model.id, 'gpt-5.6-terra');
  assert.equal(resolveRoleRoute({ role: 'auditor' }).model.id, 'gpt-5.6-luna');

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
  assert.equal(resolveRoleRoute({ role: 'engineer' }).model.id, 'deepseek-v4-flash');
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
