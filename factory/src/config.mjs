import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const env = (k, d) => {
  const v = process.env[k];
  return v === undefined || v === '' ? d : v;
};
const num = (k, d) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};

const baseModel = env('GF_MODEL', 'google/gemini-2.5-flash');

export const LLM = {
  baseUrl: env('GF_LLM_BASE_URL', 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  apiKey: env('GF_LLM_API_KEY', ''),
  defaultModel: baseModel,
  models: {
    director: env('GF_MODEL_DIRECTOR', baseModel),
    engineer: env('GF_MODEL_ENGINEER', baseModel),
    playtester: env('GF_MODEL_PLAYTESTER', env('GF_VISION_MODEL', baseModel)),
    auditor: env('GF_MODEL_AUDITOR', baseModel)
  }
};

export const LIMITS = {
  maxDebugRounds: num('GF_MAX_DEBUG_ROUNDS', 4),
  maxPolishRounds: num('GF_MAX_POLISH_ROUNDS', 2),
  minOverallScore: num('GF_MIN_SCORE', 7),
  budgetUsd: num('GF_BUDGET_USD', 10),
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
