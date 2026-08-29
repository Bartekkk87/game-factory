import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildCorpusCatalog } from './corpus-metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function fail(message, code = 2) {
  console.error(`CASE EXECUTION ERROR: ${message}`);
  process.exit(code);
}

function safeOraclePath(script) {
  const value = String(script || '');
  if (!/^[A-Za-z0-9._/-]+\.mjs$/.test(value) || path.isAbsolute(value) || value.split('/').includes('..')) {
    fail(`unsafe case oracle path: ${value}`);
  }
  const absolute = path.resolve(root, value);
  if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute)) fail(`case oracle unavailable: ${value}`);
  return absolute;
}

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--case' || !args[1]) {
  fail('usage: node factory/src/evaluation/run-corpus-case.mjs --case <case-id>');
}

const registry = readJson('evaluation/corpus/registry.json');
const manifest = readJson('evaluation/corpus/s1-cases.json');
const historical = readJson('evaluation/corpus/historical-regressions.json');
const oracles = readJson('evaluation/corpus/case-oracles.json');
const catalog = buildCorpusCatalog(registry, manifest, historical, oracles);
const caseId = args[1];
const entry = catalog.find((row) => row.id === caseId);
if (!entry) fail(`unknown or inactive case id: ${caseId}`);

const absoluteOracle = safeOraclePath(entry.oracleScript);
const child = spawnSync(process.execPath, [absoluteOracle, '--case', caseId], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 32 * 1024 * 1024
});
const childExitCode = child.status ?? 1;
const caseResult = childExitCode === 0 ? 'PASS' : 'FAIL';

console.log(JSON.stringify({
  schemaVersion: 'game-factory.case-execution-result/v2',
  caseId: entry.id,
  parentSeedId: entry.parentSeedId,
  varianceDimension: entry.varianceDimension,
  controlType: entry.controlType,
  corpusPopulation: entry.population,
  sourceKind: entry.sourceKind,
  runner: oracles.executionContract.runner,
  oracle: oracles.executionContract.oracle,
  oracleScript: entry.oracleScript,
  childExitCode,
  caseResult,
  independentObservation: true
}));

if (caseResult !== entry.expectedOutcome?.caseResult) {
  if (child.stderr) console.error(child.stderr.trim());
  if (child.stdout) console.error(child.stdout.trim());
  process.exit(1);
}
