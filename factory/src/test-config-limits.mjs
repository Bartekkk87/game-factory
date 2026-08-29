import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, 'config.mjs');

function readLimits(env) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { LIMITS } from ${JSON.stringify(`file://${configPath}`)}; console.log(JSON.stringify(LIMITS));`], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
  assert.equal(result.status, 0, result.stderr);
  return { limits: JSON.parse(result.stdout.trim()), stderr: result.stderr };
}

const zero = readLimits({
  GF_MAX_DEBUG_ROUNDS: '0',
  GF_MAX_REPAIR_CALLS: '0',
  GF_MAX_POLISH_ROUNDS: '0',
  GF_MAX_FRESH_REBUILDS: '0',
  GF_MIN_SCORE: '0',
  GF_REPAIR_BUDGET_USD: '0'
}).limits;
assert.equal(zero.maxDebugRounds, 0);
assert.equal(zero.maxRepairCalls, 0);
assert.equal(zero.maxPolishRounds, 0);
assert.equal(zero.maxFreshRebuilds, 0);
assert.equal(zero.minOverallScore, 0);
assert.equal(zero.repairBudgetUsd, 0);
assert.equal(zero.directorMaxTokens, 32768);
assert.equal(zero.engineerMaxTokens, 65536);
assert.equal(zero.playtesterMaxTokens, 32768);
assert.equal(zero.auditorMaxTokens, 16384);

const configuredTokenBudgets = readLimits({
  GF_DIRECTOR_MAX_TOKENS: '40000',
  GF_ENGINEER_MAX_TOKENS: '50000',
  GF_PLAYTESTER_MAX_TOKENS: '24000',
  GF_AUDITOR_MAX_TOKENS: '12000'
}).limits;
assert.equal(configuredTokenBudgets.directorMaxTokens, 40000);
assert.equal(configuredTokenBudgets.engineerMaxTokens, 50000);
assert.equal(configuredTokenBudgets.playtesterMaxTokens, 24000);
assert.equal(configuredTokenBudgets.auditorMaxTokens, 12000);

const invalid = readLimits({
  GF_MAX_REPAIR_CALLS: '-1',
  GF_BUDGET_USD: '0',
  GF_DIRECTOR_MAX_TOKENS: '0',
  GF_ENGINEER_MAX_TOKENS: '0',
  GF_PLAYTESTER_MAX_TOKENS: '-1',
  GF_AUDITOR_MAX_TOKENS: 'x'
});
assert.equal(invalid.limits.maxRepairCalls, 6);
assert.equal(invalid.limits.budgetUsd, 10);
assert.equal(invalid.limits.directorMaxTokens, 32768);
assert.equal(invalid.limits.engineerMaxTokens, 65536);
assert.equal(invalid.limits.playtesterMaxTokens, 32768);
assert.equal(invalid.limits.auditorMaxTokens, 16384);
for (const key of [
  'GF_MAX_REPAIR_CALLS', 'GF_BUDGET_USD', 'GF_DIRECTOR_MAX_TOKENS',
  'GF_ENGINEER_MAX_TOKENS', 'GF_PLAYTESTER_MAX_TOKENS', 'GF_AUDITOR_MAX_TOKENS'
]) assert.match(invalid.stderr, new RegExp(`ignoring invalid ${key}`));

console.log('config limit selftest: PASS');
