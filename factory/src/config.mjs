import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = (k, d) => {
  const v = process.env[k];
  return v === undefined || v === '' ? d : v;
};
const num = (k, d) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};
// Provider-Registry: each provider has its own defaults for baseUrl + default model.
// Selection via GF_LLM_PROVIDER (openai | openrouter | googleai | huggingface).
// All values overridable via GF_LLM_BASE_URL / GF_MODEL / GF_LLM_API_KEY env vars.
const PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    roleModels: {
      director: 'gpt-4o-mini',
      engineer: 'gpt-4o',
      playtester: 'gpt-4o-mini',
      auditor: 'gpt-4o-mini'
    }
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash'
  },
  googleai: {
    // Google AI Studio OpenAI-compatible endpoint (v1beta/openai)
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash'
  },
  huggingface: {
    // HF Inference Router (OpenAI-compatible)
    baseUrl: 'https://router.huggingface.co/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct'
  }
};
const providerKey = env('GF_LLM_PROVIDER', 'openai').toLowerCase();
const provider = PROVIDERS[providerKey] || PROVIDERS.openai;
const explicitBaseModel = process.env.GF_MODEL?.trim();
const baseModel = explicitBaseModel || provider.defaultModel;
const roleDefault = (role) => explicitBaseModel || provider.roleModels?.[role] || baseModel;
export const LLM = {
  provider: PROVIDERS[providerKey] ? providerKey : 'openai',
  baseUrl: env('GF_LLM_BASE_URL', provider.baseUrl).replace(/\/$/, ''),
  apiKey: env('GF_LLM_API_KEY', ''),
  defaultModel: baseModel,
  models: {
    director: env('GF_MODEL_DIRECTOR', roleDefault('director')),
    engineer: env('GF_MODEL_ENGINEER', roleDefault('engineer')),
    playtester: env('GF_MODEL_PLAYTESTER', env('GF_VISION_MODEL', roleDefault('playtester'))),
    auditor: env('GF_MODEL_AUDITOR', roleDefault('auditor'))
  }
};
export const LIMITS = {
  maxDebugRounds: num('GF_MAX_DEBUG_ROUNDS', 4),
  maxRepairCalls: num('GF_MAX_REPAIR_CALLS', 6),
  maxPolishRounds: num('GF_MAX_POLISH_ROUNDS', 3),
  maxFreshRebuilds: num('GF_MAX_FRESH_REBUILDS', 1),
  minOverallScore: num('GF_MIN_SCORE', 6.5),
  budgetUsd: num('GF_BUDGET_USD', 10),
  repairBudgetUsd: num('GF_REPAIR_BUDGET_USD', 4),
  polishBudgetUsd: num('GF_POLISH_BUDGET_USD', 3),
  freshRebuildBudgetUsd: num('GF_FRESH_REBUILD_BUDGET_USD', 4),
  playSeconds: num('GF_PLAY_SECONDS', 12),
  minFps: num('GF_MIN_FPS', 30)
};
export const PATHS = {
  products: path.join(ROOT, 'products'),
  drafts: path.join(ROOT, 'drafts'),
  runs: path.join(ROOT, 'runs'),
  memoryDir: path.join(ROOT, 'memory'),
  skills: path.join(ROOT, 'skills'),
  prompts: path.join(ROOT, 'factory', 'prompts'),
  engineFile: path.join(ROOT, 'engine', 'gf-engine.js')
};
