import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const num = (k, d) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
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
