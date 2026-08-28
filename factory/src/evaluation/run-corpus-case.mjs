import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'evaluation/corpus/registry.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'evaluation/corpus/s1-cases.json'), 'utf8'));

function fail(message, code = 2) {
  console.error(`S1 CASE EXECUTION ERROR: ${message}`);
  process.exit(code);
}

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--case' || !args[1]) {
  fail('usage: node factory/src/evaluation/run-corpus-case.mjs --case <case-id>');
}

const caseId = args[1];
const seed = registry.cases.find((entry) => entry.seed && entry.id === caseId);
const variant = manifest.variants.find((entry) => entry.id === caseId);
if (seed && variant) fail(`case id collision: ${caseId}`);
if (!seed && !variant) fail(`unknown case id: ${caseId}`);

let entry;
let execution;
if (seed) {
  const script = manifest.seedScripts?.[caseId];
  if (!script) fail(`seed execution contract missing: ${caseId}`);
  execution = { ...manifest.executionContract, script };
  entry = {
    id: seed.id,
    expectedOutcome: seed.expectedOutcome,
    parentSeedId: null,
    varianceDimension: null,
    controlType: 'seed',
    corpusPopulation: manifest.corpusPopulation,
    active: seed.active
  };
} else {
  entry = {
    ...variant,
    corpusPopulation: manifest.corpusPopulation
  };
  execution = { ...manifest.executionContract, script: variant.script };
}

if (!entry.active) fail(`case is inactive: ${caseId}`);
if (execution?.runner !== 'node-selftest') fail(`unsupported runner for ${caseId}`);
if (execution?.oracle !== 'exit-code-zero') fail(`unsupported oracle for ${caseId}`);

const script = String(execution?.script || '');
if (!/^[A-Za-z0-9._/-]+\.mjs$/.test(script) || path.isAbsolute(script) || script.split('/').includes('..')) {
  fail(`unsafe execution script for ${caseId}: ${script}`);
}
const absoluteScript = path.resolve(root, script);
if (!absoluteScript.startsWith(`${root}${path.sep}`) || !fs.existsSync(absoluteScript)) {
  fail(`execution script is unavailable for ${caseId}: ${script}`);
}

const child = spawnSync(process.execPath, [absoluteScript], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 16 * 1024 * 1024
});
const exitCode = child.status ?? 1;
const caseResult = exitCode === 0 ? 'PASS' : 'FAIL';

console.log(JSON.stringify({
  schemaVersion: 'game-factory.case-execution-result/v1',
  caseId: entry.id,
  parentSeedId: entry.parentSeedId,
  varianceDimension: entry.varianceDimension,
  controlType: entry.controlType,
  corpusPopulation: entry.corpusPopulation,
  runner: execution.runner,
  script,
  oracle: execution.oracle,
  childExitCode: exitCode,
  caseResult
}));

if (caseResult !== entry.expectedOutcome?.caseResult) {
  if (child.stderr) console.error(child.stderr.trim());
  if (child.stdout) console.error(child.stdout.trim());
  process.exit(1);
}
