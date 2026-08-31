import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateKeplerM1Launch } from './kepler-launch-gate.mjs';

export const KEPLER_M1_ZERO_SPEND_RETRY_AUTHORITY = Object.freeze({
  schemaVersion: 'project-game.autonomous-retry/v1',
  retryId: 'KEPLER-M1-T1-ZERO-SPEND-RETRY-1',
  projectId: 'kepler-outpost',
  taskId: 'KEPLER-M1-T1',
  originalLaunchId: 'KEPLER-M1-T1-AUTONOMOUS-1',
  failedWorkflowRunId: 33399897735,
  failedJobId: 99513414056,
  failedStep: 'Execute bounded low-cost Kepler M1',
  failureMessage: 'PG-A0 must start on main, found HEAD',
  modelRequestReached: false,
  singleRetry: true
});

const RETRY_KEYS = [
  'schemaVersion', 'retryId', 'projectId', 'taskId', 'originalLaunchId',
  'failedWorkflowRunId', 'failedJobId', 'failedStep', 'failureMessage',
  'modelRequestReached', 'baseAuthoritySha', 'singleRetry'
];

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

function assertRetryAuthority(retry, expectedBaseSha) {
  assertExactKeys(retry, RETRY_KEYS, 'Kepler retry record');
  assertSha(expectedBaseSha, 'Expected retry base authority');
  assertSha(retry.baseAuthoritySha, 'Retry base authority');
  for (const key of Object.keys(KEPLER_M1_ZERO_SPEND_RETRY_AUTHORITY)) {
    assert.deepEqual(retry[key], KEPLER_M1_ZERO_SPEND_RETRY_AUTHORITY[key], `Kepler retry ${key} mismatch`);
  }
  assert.equal(retry.baseAuthoritySha, expectedBaseSha, 'Kepler retry base authority mismatch');
}

export function validateKeplerM1ZeroSpendRetry({ retry, launch, task, expectedBaseSha }) {
  assertObject(launch, 'Original Kepler launch record');
  const launchEvidence = validateKeplerM1Launch({
    launch,
    task,
    expectedBaseSha: launch.baseAuthoritySha
  });
  assert.equal(launchEvidence.launchId, retry?.originalLaunchId, 'Kepler retry original launch mismatch');
  assert.equal(launchEvidence.singleRun, true, 'Original Kepler launch must remain single-run');
  assertRetryAuthority(retry, expectedBaseSha);
  return {
    schemaVersion: 'project-game.autonomous-retry-evidence/v1',
    retryId: retry.retryId,
    projectId: retry.projectId,
    taskId: retry.taskId,
    originalLaunchId: retry.originalLaunchId,
    failedWorkflowRunId: retry.failedWorkflowRunId,
    failedJobId: retry.failedJobId,
    failedStep: retry.failedStep,
    failureMessage: retry.failureMessage,
    modelRequestReached: retry.modelRequestReached,
    baseAuthoritySha: retry.baseAuthoritySha,
    singleRetry: retry.singleRetry,
    provider: launchEvidence.provider,
    model: launchEvidence.model,
    budgetUsd: launchEvidence.budgetUsd,
    scopeModify: [...launchEvidence.scopeModify]
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  const [retryPath, launchPath, taskPath, expectedBaseSha] = process.argv.slice(2);
  assert.ok(
    retryPath && launchPath && taskPath && expectedBaseSha,
    'usage: kepler-retry-gate.mjs <retry.json> <launch.json> <task.json> <base-sha>'
  );
  const evidence = validateKeplerM1ZeroSpendRetry({
    retry: readJson(retryPath),
    launch: readJson(launchPath),
    task: readJson(taskPath),
    expectedBaseSha
  });
  console.log(JSON.stringify(evidence));
}
