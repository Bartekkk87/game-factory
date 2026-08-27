import assert from 'node:assert/strict';
import { getModelRecord, UnknownModelError } from './model-registry.mjs';
import { runtimeProvider, OPENROUTER_CREDENTIAL_ENV } from './provider-registry.mjs';
import { resolveRoleRoute, roleDefaultsSnapshot } from './router.mjs';

const keys=['GF_LLM_PROVIDER','GF_MODEL','GF_LLM_LANE','GF_LLM_API_KEY','GF_LLM_API_KEY_OPENROUTER','GF_LLM_PROVIDER_ENGINEER','GF_MODEL_ENGINEER','GF_LLM_LANE_ENGINEER','OPENROUTER_PRODUCTION','OPENROUTER_BENCHMARK','OPENROUTER_IMPROVEMENT'];
const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));for(const k of keys)delete process.env[k];
try{
  const defaults=roleDefaultsSnapshot();assert.equal(defaults.engineer.provider,'openai');assert.equal(defaults.engineer.model,'gpt-5.6-terra');assert.equal(resolveRoleRoute({role:'engineer',operation:'build'}).provider.id,'openai');
  const challenger=getModelRecord('openrouter','deepseek/deepseek-chat-v3.1');assert.equal(challenger.productionDefault,false);assert.equal(challenger.benchmarkStatus,'challenger');assert.equal(challenger.pricing.source,'openrouter-official-2026-08-27');assert.throws(()=>getModelRecord('openrouter','definitely-unknown'),UnknownModelError);
  process.env.OPENROUTER_PRODUCTION='prod-key';process.env.OPENROUTER_BENCHMARK='bench-key';process.env.OPENROUTER_IMPROVEMENT='improve-key';
  assert.equal(runtimeProvider('openrouter',{credentialLane:'production'}).apiKey,'prod-key');assert.equal(runtimeProvider('openrouter',{credentialLane:'benchmark'}).apiKey,'bench-key');assert.equal(runtimeProvider('openrouter',{credentialLane:'improvement'}).apiKey,'improve-key');assert.equal(runtimeProvider('openrouter',{credentialLane:'benchmark'}).credentialEnv,OPENROUTER_CREDENTIAL_ENV.benchmark);
  delete process.env.OPENROUTER_BENCHMARK;process.env.GF_LLM_API_KEY_OPENROUTER='legacy-prod';assert.equal(runtimeProvider('openrouter',{credentialLane:'benchmark'}).apiKey,'');assert.equal(runtimeProvider('openrouter',{credentialLane:'improvement'}).apiKey,'improve-key');
  process.env.OPENROUTER_BENCHMARK='bench-key';process.env.GF_LLM_PROVIDER_ENGINEER='openrouter';process.env.GF_MODEL_ENGINEER='deepseek/deepseek-chat-v3.1';process.env.GF_LLM_LANE_ENGINEER='benchmark';
  const route=resolveRoleRoute({role:'engineer',operation:'build',requirements:{jsonObject:true,maxOutputTokens:12000}});assert.equal(route.provider.id,'openrouter');assert.equal(route.model.id,'deepseek/deepseek-chat-v3.1');assert.equal(route.credentialLane,'benchmark');assert.equal(route.provider.apiKey,'bench-key');
  delete process.env.GF_MODEL_ENGINEER;assert.equal(resolveRoleRoute({role:'engineer',operation:'build'}).model.id,'deepseek/deepseek-chat-v3.1');
  console.log('OpenRouter lane/model selftest: PASS');
}finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
