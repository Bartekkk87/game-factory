import assert from 'node:assert/strict';
import { KEPLER_M1_LAUNCH_AUTHORITY } from './kepler-launch-gate.mjs';
import { KEPLER_M1_ZERO_SPEND_RETRY_AUTHORITY } from './kepler-retry-gate.mjs';
import {
  KEPLER_M1_OWNER_RETRY_AUTHORITY,
  validateKeplerM1OwnerRetry
} from './kepler-owner-retry-gate.mjs';

const ORIGINAL_BASE_SHA = 'a'.repeat(40);
const PRIOR_RETRY_BASE_SHA = 'b'.repeat(40);
const OWNER_RETRY_BASE_SHA = 'c'.repeat(40);
const launch = {
  ...KEPLER_M1_LAUNCH_AUTHORITY,
  baseAuthoritySha: ORIGINAL_BASE_SHA
};
const priorRetry = {
  ...KEPLER_M1_ZERO_SPEND_RETRY_AUTHORITY,
  baseAuthoritySha: PRIOR_RETRY_BASE_SHA
};
const ownerRetry = {
  ...KEPLER_M1_OWNER_RETRY_AUTHORITY,
  baseAuthoritySha: OWNER_RETRY_BASE_SHA
};
const task = {
  schemaVersion: 'project-game.task/v1',
  projectId: 'kepler-outpost',
  taskId: 'KEPLER-M1-T1',
  milestoneId: 'M1',
  immutable: true,
  contractSha256: '8e073b8afd2c7a15cdfb4bddfb7b181be6ba5ca74e843ce60af50f3819a7054d',
  scope: {
    add: [],
    modify: ['src/play.html', 'src/play.mjs', 'src/simulation.mjs', 'src/state.mjs'],
    delete: [],
    protected: ['persistence', 'tests'],
    maxFilesChanged: 4
  }
};
const ownerApproval = {
  schemaVersion: 'project-game.owner-task-approval/v1',
  projectId: 'kepler-outpost',
  taskId: 'KEPLER-M1-T1',
  taskContractSha256: '8e073b8afd2c7a15cdfb4bddfb7b181be6ba5ca74e843ce60af50f3819a7054d',
  approvedBy: 'owner',
  authorityVersion: 'kepler-canary-go-2026-08-30/v1'
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

const evidence = validateKeplerM1OwnerRetry({
  retry: ownerRetry,
  launch,
  priorRetry,
  task,
  ownerApproval,
  expectedBaseSha: OWNER_RETRY_BASE_SHA
});
assert.equal(evidence.retryId, 'KEPLER-M1-T1-OWNER-RETRY-2');
assert.equal(evidence.originalLaunchId, 'KEPLER-M1-T1-AUTONOMOUS-1');
assert.equal(evidence.priorRetryId, 'KEPLER-M1-T1-ZERO-SPEND-RETRY-1');
assert.equal(evidence.failedWorkflowRunId, 33403550650);
assert.equal(evidence.failedJobId, 99525536760);
assert.equal(evidence.failureClass, 'invalid-model-json');
assert.equal(evidence.failureMessage, 'No valid JSON found in LLM response');
assert.equal(evidence.modelRequestReached, true);
assert.equal(evidence.priorModelCostUsd, 0.005247);
assert.equal(evidence.repairSha, '9ebc8a33eed50d6364078b14808b7a7ab705a286');
assert.equal(evidence.ownerAuthorityVersion, 'kepler-canary-go-2026-08-30/v1');
assert.equal(evidence.singleRetry, true);
assert.equal(evidence.provider, 'openrouter');
assert.equal(evidence.model, 'deepseek/deepseek-chat-v3.1');
assert.equal(evidence.budgetUsd, 0.05);

for (const [field, value] of [
  ['retryId', 'OTHER-RETRY'],
  ['projectId', 'other-project'],
  ['taskId', 'OTHER-TASK'],
  ['originalLaunchId', 'OTHER-LAUNCH'],
  ['priorRetryId', 'OTHER-PRIOR-RETRY'],
  ['failedWorkflowRunId', 1],
  ['failedJobId', 1],
  ['failedStep', 'other-step'],
  ['failureClass', 'other-class'],
  ['failureMessage', 'other-failure'],
  ['modelRequestReached', false],
  ['priorModelCostUsd', 0],
  ['repairSha', 'd'.repeat(40)],
  ['ownerApprovalPath', 'other/path.json'],
  ['ownerAuthorityVersion', 'other/v1'],
  ['singleRetry', false]
]) {
  const bad = copy(ownerRetry);
  bad[field] = value;
  assert.throws(
    () => validateKeplerM1OwnerRetry({
      retry: bad,
      launch,
      priorRetry,
      task,
      ownerApproval,
      expectedBaseSha: OWNER_RETRY_BASE_SHA
    }),
    /mismatch/
  );
}

const wrongBase = copy(ownerRetry);
wrongBase.baseAuthoritySha = 'd'.repeat(40);
assert.throws(
  () => validateKeplerM1OwnerRetry({
    retry: wrongBase,
    launch,
    priorRetry,
    task,
    ownerApproval,
    expectedBaseSha: OWNER_RETRY_BASE_SHA
  }),
  /base authority mismatch/
);

const extraKey = copy(ownerRetry);
extraKey.secondRetry = true;
assert.throws(
  () => validateKeplerM1OwnerRetry({
    retry: extraKey,
    launch,
    priorRetry,
    task,
    ownerApproval,
    expectedBaseSha: OWNER_RETRY_BASE_SHA
  }),
  /keys must be exact/
);

const alteredPriorRetry = copy(priorRetry);
alteredPriorRetry.retryId = 'OTHER-RETRY';
assert.throws(
  () => validateKeplerM1OwnerRetry({
    retry: ownerRetry,
    launch,
    priorRetry: alteredPriorRetry,
    task,
    ownerApproval,
    expectedBaseSha: OWNER_RETRY_BASE_SHA
  }),
  /mismatch/
);

for (const [field, value] of [
  ['approvedBy', 'not-owner'],
  ['authorityVersion', 'other/v1'],
  ['taskContractSha256', 'e'.repeat(64)]
]) {
  const badApproval = copy(ownerApproval);
  badApproval[field] = value;
  assert.throws(
    () => validateKeplerM1OwnerRetry({
      retry: ownerRetry,
      launch,
      priorRetry,
      task,
      ownerApproval: badApproval,
      expectedBaseSha: OWNER_RETRY_BASE_SHA
    }),
    /mismatch|owner-bound/
  );
}

console.log('KEPLER_M1_OWNER_RETRY_GATE_SELFTEST=PASS');
