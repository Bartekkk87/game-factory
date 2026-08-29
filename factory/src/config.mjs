import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function configuredNumber(key, fallback, { min, integer = false }) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  const valid = Number.isFinite(value) && value >= min && (!integer || Number.isInteger(value));
  if (valid) return value;
  console.warn(`[config] ignoring invalid ${key}=${JSON.stringify(raw)}; using ${fallback}`);
  return fallback;
}

const count = (key, fallback) => configuredNumber(key, fallback, { min: 0, integer: true });
const tokenCeiling = (key, fallback) => configuredNumber(key, fallback, { min: 1, integer: true });
const nonNegative = (key, fallback) => configuredNumber(key, fallback, { min: 0 });
const positive = (key, fallback) => configuredNumber(key, fallback, { min: Number.EPSILON });

export const LIMITS = {
  maxDebugRounds: count('GF_MAX_DEBUG_ROUNDS', 4),
  maxRepairCalls: count('GF_MAX_REPAIR_CALLS', 6),
  maxPolishRounds: count('GF_MAX_POLISH_ROUNDS', 3),
  maxFreshRebuilds: count('GF_MAX_FRESH_REBUILDS', 1),
  // Ceilings are generous guards, not target lengths. Cost/call budgets remain authoritative.
  directorMaxTokens: tokenCeiling('GF_DIRECTOR_MAX_TOKENS', 32768),
  engineerMaxTokens: tokenCeiling('GF_ENGINEER_MAX_TOKENS', 65536),
  playtesterMaxTokens: tokenCeiling('GF_PLAYTESTER_MAX_TOKENS', 32768),
  auditorMaxTokens: tokenCeiling('GF_AUDITOR_MAX_TOKENS', 16384),
  minOverallScore: nonNegative('GF_MIN_SCORE', 6.5),
  budgetUsd: positive('GF_BUDGET_USD', 10),
  repairBudgetUsd: nonNegative('GF_REPAIR_BUDGET_USD', 4),
  polishBudgetUsd: nonNegative('GF_POLISH_BUDGET_USD', 3),
  freshRebuildBudgetUsd: nonNegative('GF_FRESH_REBUILD_BUDGET_USD', 4),
  playSeconds: positive('GF_PLAY_SECONDS', 12),
  maxProofSeconds: positive('GF_MAX_PROOF_SECONDS', 125),
  minFps: positive('GF_MIN_FPS', 30)
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
