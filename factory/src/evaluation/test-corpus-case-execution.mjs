import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const runner = path.join(root, 'factory/src/evaluation/run-corpus-case.mjs');

function execute(caseId) {
  return spawnSync(process.execPath, [runner, '--case', caseId], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
}

for (const caseId of [
  'gp-proof-plan-terminal-reachability',
  'gp-terminal-unknown-dead-reject',
  'fr-runtime-error-jitter-normalized'
]) {
  const result = execute(caseId);
  assert.equal(result.status, 0, `${caseId} execution failed: ${result.stderr || result.stdout}`);
  const parsed = JSON.parse(result.stdout.trim());
  assert.equal(parsed.schemaVersion, 'game-factory.case-execution-result/v1');
  assert.equal(parsed.caseId, caseId);
  assert.equal(parsed.runner, 'node-selftest');
  assert.equal(parsed.oracle, 'exit-code-zero');
  assert.equal(parsed.childExitCode, 0);
  assert.equal(parsed.caseResult, 'PASS');
  assert.equal(parsed.corpusPopulation, 'development-regression');
}

const variantResult = JSON.parse(execute('gp-terminal-unknown-dead-reject').stdout.trim());
assert.equal(variantResult.parentSeedId, 'gp-terminal-alias-fidelity');
assert.equal(variantResult.varianceDimension, 'unsupported-terminal-vocabulary');
assert.equal(variantResult.controlType, 'negative');

const missing = execute('does-not-exist');
assert.notEqual(missing.status, 0, 'unknown corpus case must fail closed');
assert.match(missing.stderr, /unknown case id/i);

console.log('GOLDEN CORPUS S1a CASE EXECUTION PASS: individual zero-paid seeds and S1b variants have a deterministic script + exit-code oracle; no corpus-wide S2 runner exists.');
