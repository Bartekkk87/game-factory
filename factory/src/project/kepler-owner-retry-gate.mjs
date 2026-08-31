import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateKeplerM1Launch } from './kepler-launch-gate.mjs';
import { validateKeplerM1ZeroSpendRetry } from './kepler-retry-gate.mjs';

export const KEPLER_M1_OWNER_RETRY_AUTHORITY = Object.freeze({
  schemaVersion: 'project-game.owner-authorized-retry/v1',
  retryId: 'KEPLER-M1-T1-OWNER-RETRY-2',
  projectId: 'kepler-outpost',
  taskId: 'KEPLER-M1-T1',
  originalLaunchId: 'KEPLER-M1-T1-AUTONOMOUS-1',
  priorRetryId: 'KEPLER-M1-T1-ZERO-SPEND-RETRY-1',
  failedWorkflowRunId: 33403550650,
  failedJobId: 99525536760,
  failedStep: 'Execute bounded low-cost Kepler M1',
  failureClass: 'invalid-model-json',
  failureMessage: 'No valid JSON found in LLM response',
  modelRequestReached: true,
  priorModelCostUsd: 0.005247,
  repairSha: '9ebc8a33eed50d6364078b14808b7a7ab705a286',
  ownerApprovalPath: 'projects/kepler-outpost/.factory/approvals/KEPLER-M1-T1.json',
  ownerAuthorityVersion: 'kepler-canary-go-2026-08-30/v1',
  singleRetry: true
});

const OWNER_RETRY_KEYS = [
  'schemaVersion', 'retryId', 'projectId', 'taskId', 'originalLaunchId', 'priorRetryId',
  'failedWorkflowRunId', 'failedJobId', 'failedStep', 'failureClass', 'failureMessage',
  'modelRequestReached', 'priorModelCostUsd', 'repairSha', 'ownerApprovalPath',
  'ownerAuthorityVersion', 'baseAuthoritySha', 'singleRetry'
];
const OWNER_APPROVAL_KEYS = [
  'schemaVersion', 'projectId', 'taskId', 'taskContractSha256', 'approvedBy', 'authorityVersion'
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

function assertOwnerRetryAuthority(retry, expectedBaseSha) {
  assertExactKeys(retry, OWNER_RETRY_KEYS, 'Kepler owner retry record');
  assertSha(expectedBaseSha, 'Expected owner retry base authority');
  assertSha(retry.baseAuthoritySha, 'Owner retry base authority');
  for (const key of Object.keys(KEPLER_M1_OWNER_RETRY_AUTHORITY)) {
    assert.deepEqual(retry[key], KEPLER_M1_OWNER_RETRY_AUTHORITY[key], `Kepler owner retry ${key} mismatch`);
  }
  assert.equal(retry.baseAuthoritySha, expectedBaseSha, 'Kepler owner retry base authority mismatch');
}

function assertOwnerApproval(ownerApproval, taskContractSha256) {
  assertExactKeys(ownerApproval, OWNER_APPROVAL_KEYS, 'Kepler owner approval');
  assert.equal(ownerApproval.schemaVersion, 'project-game.owner-task-approval/v1', 'Kepler owner approval schema mismatch');
  assert.equal(ownerApproval.projectId, KEPLER_M1_OWNER_RETRY_AUTHORITY.projectId, 'Kepler owner approval project mismatch');
  assert.equal(ownerApproval.taskId, KEPLER_M1_OWNER_RETRY_AUTHORITY.taskId, 'Kepler owner approval task mismatch');
  assert.equal(ownerApproval.taskContractSha256, taskContractSha256, 'Kepler owner approval task contract mismatch');
  assert.equal(ownerApproval.approvedBy, 'owner', 'Kepler owner approval must be owner-bound');
  assert.equal(
    ownerApproval.authorityVersion,
    KEPLER_M1_OWNER_RETRY_AUTHORITY.ownerAuthorityVersion,
    'Kepler owner approval authority version mismatch'
  );
}

export function validateKeplerM1OwnerRetry({
  retry,
  launch,
  priorRetry,
  task,
  ownerApproval,
  expectedBaseSha
}) {
  assertObject(launch, 'Original Kepler launch record');
  assertObject(priorRetry, 'Prior Kepler retry record');
  const launchEvidence = validateKeplerM1Launch({
    launch,
    task,
    expectedBaseSha: launch.baseAuthoritySha
  });
  const priorRetryEvidence = validateKeplerM1ZeroSpendRetry({
    retry: priorRetry,
    launch,
    task,
    expectedBaseSha: priorRetry.baseAuthoritySha
  });
  assert.equal(launchEvidence.launchId, retry?.originalLaunchId, 'Kepler owner retry original launch mismatch');
  assert.equal(priorRetryEvidence.retryId, retry?.priorRetryId, 'Kepler owner retry prior retry mismatch');
  assert.equal(priorRetryEvidence.singleRetry, true, 'Prior Kepler retry must remain single-retry');
  assertOwnerApproval(ownerApproval, launchEvidence.taskContractSha256);
  assertOwnerRetryAuthority(retry, expectedBaseSha);

  return {
    schemaVersion: 'project-game.owner-authorized-retry-evidence/v1',
    retryId: retry.retryId,
    projectId: retry.projectId,
    taskId: retry.taskId,
    originalLaunchId: retry.originalLaunchId,
    priorRetryId: retry.priorRetryId,
    failedWorkflowRunId: retry.failedWorkflowRunId,
    failedJobId: retry.failedJobId,
    failedStep: retry.failedStep,
    failureClass: retry.failureClass,
    failureMessage: retry.failureMessage,
    modelRequestReached: retry.modelRequestReached,
    priorModelCostUsd: retry.priorModelCostUsd,
    repairSha: retry.repairSha,
    ownerApprovalPath: retry.ownerApprovalPath,
    ownerAuthorityVersion: retry.ownerAuthorityVersion,
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
  const [retryPath, launchPath, priorRetryPath, taskPath, ownerApprovalPath, expectedBaseSha] = process.argv.slice(2);
  assert.ok(
    retryPath && launchPath && priorRetryPath && taskPath && ownerApprovalPath && expectedBaseSha,
    'usage: kepler-owner-retry-gate.mjs <owner-retry.json> <launch.json> <prior-retry.json> <task.json> <owner-approval.json> <base-sha>'
  );
  const evidence = validateKeplerM1OwnerRetry({
    retry: readJson(retryPath),
    launch: readJson(launchPath),
    priorRetry: readJson(priorRetryPath),
    task: readJson(taskPath),
    ownerApproval: readJson(ownerApprovalPath),
    expectedBaseSha
  });
  console.log(JSON.stringify(evidence));
}
