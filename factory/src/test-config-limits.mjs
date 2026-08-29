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
assert.equal(zero.directorMaxTokens, 8192);

const configuredDirectorBudget = readLimits({ GF_DIRECTOR_MAX_TOKENS: '32768' }).limits;
assert.equal(configuredDirectorBudget.directorMaxTokens, 32768);

const invalid = readLimits({ GF_MAX_REPAIR_CALLS: '-1', GF_BUDGET_USD: '0', GF_DIRECTOR_MAX_TOKENS: '0' });
assert.equal(invalid.limits.maxRepairCalls, 6);
assert.equal(invalid.limits.budgetUsd, 10);
assert.equal(invalid.limits.directorMaxTokens, 8192);
assert.match(invalid.stderr, /ignoring invalid GF_MAX_REPAIR_CALLS/);
assert.match(invalid.stderr, /ignoring invalid GF_BUDGET_USD/);
assert.match(invalid.stderr, /ignoring invalid GF_DIRECTOR_MAX_TOKENS/);

console.log('config limit selftest: PASS');
