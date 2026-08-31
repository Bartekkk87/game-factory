import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KEPLER_M1_LAUNCH_AUTHORITY = Object.freeze({
  schemaVersion: 'project-game.autonomous-launch/v1',
  launchId: 'KEPLER-M1-T1-AUTONOMOUS-1',
  projectId: 'kepler-outpost',
  taskId: 'KEPLER-M1-T1',
  taskContractSha256: '8e073b8afd2c7a15cdfb4bddfb7b181be6ba5ca74e843ce60af50f3819a7054d',
  provider: 'openrouter',
  model: 'deepseek/deepseek-chat-v3.1',
  budgetUsd: 0.05,
  singleRun: true
});

const LAUNCH_KEYS = [
  'schemaVersion', 'launchId', 'projectId', 'taskId', 'taskContractSha256',
  'provider', 'model', 'budgetUsd', 'baseAuthoritySha', 'singleRun'
];
const M1_MODIFY = ['src/play.html', 'src/play.mjs', 'src/simulation.mjs', 'src/state.mjs'];

function assertObject(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
}

function assertExactKeys(value, expectedKeys, label) {
  assertObject(value, label);
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort(), `${label} keys must be exact`);
}

function assertSha(value, label) {
  assert.match(String(value || ''), /^[0-9a-f]{40}$/, `${label} must be an exact lowercase commit SHA`);
}

function assertLaunchAuthority(launch, expectedBaseSha) {
  assertExactKeys(launch, LAUNCH_KEYS, 'Kepler launch record');
  assertSha(expectedBaseSha, 'Expected base authority');
  assertSha(launch.baseAuthoritySha, 'Launch base authority');
  for (const key of Object.keys(KEPLER_M1_LAUNCH_AUTHORITY)) {
    assert.deepEqual(launch[key], KEPLER_M1_LAUNCH_AUTHORITY[key], `Kepler launch ${key} mismatch`);
  }
  assert.equal(launch.baseAuthoritySha, expectedBaseSha, 'Kepler launch base authority mismatch');
}

function assertTaskAuthority(task) {
  assertObject(task, 'Kepler task contract');
  assert.equal(task.schemaVersion, 'project-game.task/v1');
  assert.equal(task.projectId, KEPLER_M1_LAUNCH_AUTHORITY.projectId);
  assert.equal(task.taskId, KEPLER_M1_LAUNCH_AUTHORITY.taskId);
  assert.equal(task.milestoneId, 'M1');
  assert.equal(task.contractSha256, KEPLER_M1_LAUNCH_AUTHORITY.taskContractSha256);
  assert.equal(task.immutable, true, 'Kepler M1 task contract must remain immutable');
  assertObject(task.scope, 'Kepler M1 task scope');
  assert.deepEqual(task.scope.add, [], 'Kepler M1 may not add source files');
  assert.deepEqual(task.scope.modify, M1_MODIFY, 'Kepler M1 modify scope changed');
  assert.deepEqual(task.scope.delete, [], 'Kepler M1 may not delete files');
  assert.deepEqual(task.scope.protected, ['persistence', 'tests'], 'Kepler M1 protected scope changed');
  assert.equal(task.scope.maxFilesChanged, M1_MODIFY.length, 'Kepler M1 file limit changed');
}

export function validateKeplerM1Launch({ launch, task, expectedBaseSha }) {
  assertLaunchAuthority(launch, expectedBaseSha);
  assertTaskAuthority(task);
  return {
    schemaVersion: 'project-game.autonomous-launch-evidence/v1',
    launchId: launch.launchId,
    projectId: launch.projectId,
    taskId: launch.taskId,
    taskContractSha256: launch.taskContractSha256,
    baseAuthoritySha: launch.baseAuthoritySha,
    provider: launch.provider,
    model: launch.model,
    budgetUsd: launch.budgetUsd,
    singleRun: launch.singleRun,
    scopeModify: [...M1_MODIFY]
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  const [launchPath, taskPath, expectedBaseSha] = process.argv.slice(2);
  assert.ok(launchPath && taskPath && expectedBaseSha, 'usage: kepler-launch-gate.mjs <launch.json> <task.json> <base-sha>');
  const evidence = validateKeplerM1Launch({
    launch: readJson(launchPath),
    task: readJson(taskPath),
    expectedBaseSha
  });
  console.log(JSON.stringify(evidence));
}
