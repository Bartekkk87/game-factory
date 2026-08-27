import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getModelRecord, UnknownModelError } from './model-registry.mjs';
import {
  runtimeProvider,
  OPENAI_PRODUCTION_CREDENTIAL_ENV,
  OPENROUTER_CREDENTIAL_ENV
} from './provider-registry.mjs';
import { resolveRoleRoute, roleDefaultsSnapshot } from './router.mjs';

const keys = [
  'GF_LLM_PROVIDER',
  'GF_MODEL',
  'GF_LLM_LANE',
  'GF_LLM_API_KEY',
  'GF_LLM_API_KEY_OPENROUTER',
  'GF_LLM_PROVIDER_ENGINEER',
  'GF_MODEL_ENGINEER',
  'GF_LLM_LANE_ENGINEER',
  'OPENAI_PRODUCTION',
  'OPENROUTER_PRODUCTION',
  'OPENROUTER_BENCHMARK',
  'OPENROUTER_IMPROVEMENT'
];
const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
for (const k of keys) delete process.env[k];

try {
  const defaults = roleDefaultsSnapshot();
  assert.equal(defaults.engineer.provider, 'openai');
  assert.equal(defaults.engineer.model, 'gpt-5.6-terra');

  process.env.OPENAI_PRODUCTION = 'openai-production-fixture';
  let openaiRoute = resolveRoleRoute({ role: 'engineer', operation: 'build' });
  assert.equal(openaiRoute.provider.id, 'openai');
  assert.equal(openaiRoute.provider.apiKey, 'openai-production-fixture');
  assert.equal(openaiRoute.provider.credentialEnv, OPENAI_PRODUCTION_CREDENTIAL_ENV);
  assert.equal(openaiRoute.provider.legacyCredentialFallback, false);

  delete process.env.OPENAI_PRODUCTION;
  process.env.GF_LLM_API_KEY = 'legacy-generic-must-not-fallback';
  assert.equal(runtimeProvider('openai').apiKey, '');
  assert.throws(
    () => runtimeProvider('openai', { credentialLane: 'benchmark' }),
    /unsupported credential lane benchmark/
  );
  delete process.env.GF_LLM_API_KEY;

  const challenger = getModelRecord('openrouter', 'deepseek/deepseek-chat-v3.1');
  assert.equal(challenger.productionDefault, false);
  assert.equal(challenger.benchmarkStatus, 'challenger');
  assert.equal(challenger.pricing.source, 'openrouter-official-2026-08-27');
  assert.throws(() => getModelRecord('openrouter', 'definitely-unknown'), UnknownModelError);

  process.env.OPENROUTER_PRODUCTION = 'openrouter-production-fixture';
  process.env.OPENROUTER_BENCHMARK = 'openrouter-benchmark-fixture';
  process.env.OPENROUTER_IMPROVEMENT = 'openrouter-improvement-fixture';
  assert.equal(runtimeProvider('openrouter', { credentialLane: 'production' }).apiKey, 'openrouter-production-fixture');
  assert.equal(runtimeProvider('openrouter', { credentialLane: 'benchmark' }).apiKey, 'openrouter-benchmark-fixture');
  assert.equal(runtimeProvider('openrouter', { credentialLane: 'improvement' }).apiKey, 'openrouter-improvement-fixture');
  assert.equal(runtimeProvider('openrouter', { credentialLane: 'benchmark' }).credentialEnv, OPENROUTER_CREDENTIAL_ENV.benchmark);

  delete process.env.OPENROUTER_PRODUCTION;
  process.env.GF_LLM_API_KEY_OPENROUTER = 'legacy-openrouter-must-not-fallback';
  process.env.GF_LLM_PROVIDER = 'openrouter';
  process.env.GF_LLM_API_KEY = 'legacy-generic-must-not-fallback';
  assert.equal(runtimeProvider('openrouter', { credentialLane: 'production' }).apiKey, '');
  assert.equal(runtimeProvider('openrouter', { credentialLane: 'benchmark' }).apiKey, 'openrouter-benchmark-fixture');

  process.env.GF_LLM_PROVIDER_ENGINEER = 'openrouter';
  process.env.GF_MODEL_ENGINEER = 'deepseek/deepseek-chat-v3.1';
  process.env.GF_LLM_LANE_ENGINEER = 'benchmark';
  const route = resolveRoleRoute({
    role: 'engineer',
    operation: 'build',
    requirements: { jsonObject: true, maxOutputTokens: 12000 }
  });
  assert.equal(route.provider.id, 'openrouter');
  assert.equal(route.model.id, 'deepseek/deepseek-chat-v3.1');
  assert.equal(route.credentialLane, 'benchmark');
  assert.equal(route.provider.apiKey, 'openrouter-benchmark-fixture');

  delete process.env.GF_MODEL_ENGINEER;
  assert.equal(resolveRoleRoute({ role: 'engineer', operation: 'build' }).model.id, 'deepseek/deepseek-chat-v3.1');

  const workflow = fs.readFileSync('.github/workflows/produce.yml', 'utf8');
  assert.match(workflow, /OPENAI_PRODUCTION:\s*\$\{\{\s*secrets\.OPENAI_PRODUCTION\s*\}\}/);
  assert.match(workflow, /OPENROUTER_PRODUCTION:\s*\$\{\{\s*secrets\.OPENROUTER_PRODUCTION\s*\}\}/);
  assert.doesNotMatch(workflow, /secrets\.GF_LLM_API_KEY\b/);

  console.log('Production credential isolation + OpenRouter lane/model selftest: PASS');
} finally {
  for (const k of keys) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}
