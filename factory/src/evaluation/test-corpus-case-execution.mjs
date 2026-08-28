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
    maxBuffer: 32 * 1024 * 1024
  });
}

for (const caseId of [
  'gp-proof-plan-terminal-reachability',
  'gp-terminal-unknown-dead-reject',
  'fr-runtime-error-jitter-normalized',
  'hr-lumen-director-state-contract',
  'hr-provider-max-completion-token-contract'
]) {
  const result = execute(caseId);
  assert.equal(result.status, 0, `${caseId} execution failed: ${result.stderr || result.stdout}`);
  const parsed = JSON.parse(result.stdout.trim());
  assert.equal(parsed.schemaVersion, 'game-factory.case-execution-result/v2');
  assert.equal(parsed.caseId, caseId);
  assert.equal(parsed.runner, 'node-case-oracle');
  assert.equal(parsed.oracle, 'case-specific-assertion');
  assert.match(parsed.oracleScript, /^factory\/src\/evaluation\/oracles\/.+-oracle\.mjs$/);
  assert.equal(parsed.childExitCode, 0);
  assert.equal(parsed.caseResult, 'PASS');
  assert.equal(parsed.independentObservation, true);
}

const variant = JSON.parse(execute('gp-terminal-unknown-dead-reject').stdout.trim());
assert.equal(variant.parentSeedId, 'gp-terminal-alias-fidelity');
assert.equal(variant.varianceDimension, 'unsupported-terminal-vocabulary');
assert.equal(variant.controlType, 'negative');
assert.equal(variant.corpusPopulation, 'development-regression');

const historical = JSON.parse(execute('hr-lumen-director-state-contract').stdout.trim());
assert.equal(historical.sourceKind, 'historical-regression');
assert.equal(historical.controlType, 'historical-regression');
assert.equal(historical.corpusPopulation, 'historical-regression');

const missing = execute('does-not-exist');
assert.notEqual(missing.status, 0, 'unknown corpus case must fail closed');
assert.match(missing.stderr, /unknown or inactive case id/i);

console.log('GOLDEN CORPUS CASE EXECUTION PASS: focused --case oracles create one independent zero-paid observation per case, including historical regressions.');
