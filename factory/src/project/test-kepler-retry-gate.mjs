import assert from 'node:assert/strict';
import { KEPLER_M1_LAUNCH_AUTHORITY } from './kepler-launch-gate.mjs';
import {
  KEPLER_M1_ZERO_SPEND_RETRY_AUTHORITY,
  validateKeplerM1ZeroSpendRetry
} from './kepler-retry-gate.mjs';

const ORIGINAL_BASE_SHA = 'a'.repeat(40);
const RETRY_BASE_SHA = 'b'.repeat(40);
const launch = {
  ...KEPLER_M1_LAUNCH_AUTHORITY,
  baseAuthoritySha: ORIGINAL_BASE_SHA
};
const retry = {
  ...KEPLER_M1_ZERO_SPEND_RETRY_AUTHORITY,
  baseAuthoritySha: RETRY_BASE_SHA
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

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

const evidence = validateKeplerM1ZeroSpendRetry({
  retry,
  launch,
  task,
  expectedBaseSha: RETRY_BASE_SHA
});
assert.equal(evidence.retryId, 'KEPLER-M1-T1-ZERO-SPEND-RETRY-1');
assert.equal(evidence.originalLaunchId, 'KEPLER-M1-T1-AUTONOMOUS-1');
assert.equal(evidence.failedWorkflowRunId, 33399897735);
assert.equal(evidence.failedJobId, 99513414056);
assert.equal(evidence.failureMessage, 'PG-A0 must start on main, found HEAD');
assert.equal(evidence.modelRequestReached, false);
assert.equal(evidence.singleRetry, true);
assert.equal(evidence.provider, 'openrouter');
assert.equal(evidence.model, 'deepseek/deepseek-chat-v3.1');
assert.equal(evidence.budgetUsd, 0.05);

for (const [field, value] of [
  ['retryId', 'OTHER-RETRY'],
  ['projectId', 'other-project'],
  ['taskId', 'OTHER-TASK'],
  ['originalLaunchId', 'OTHER-LAUNCH'],
  ['failedWorkflowRunId', 1],
  ['failedJobId', 1],
  ['failedStep', 'other-step'],
  ['failureMessage', 'other-failure'],
  ['modelRequestReached', true],
  ['singleRetry', false]
]) {
  const bad = copy(retry);
  bad[field] = value;
  assert.throws(
    () => validateKeplerM1ZeroSpendRetry({
      retry: bad,
      launch,
      task,
      expectedBaseSha: RETRY_BASE_SHA
    }),
    /mismatch/
  );
}

const wrongBase = copy(retry);
wrongBase.baseAuthoritySha = 'c'.repeat(40);
assert.throws(
  () => validateKeplerM1ZeroSpendRetry({
    retry: wrongBase,
    launch,
    task,
    expectedBaseSha: RETRY_BASE_SHA
  }),
  /base authority mismatch/
);

const extraKey = copy(retry);
extraKey.secondRetry = true;
assert.throws(
  () => validateKeplerM1ZeroSpendRetry({
    retry: extraKey,
    launch,
    task,
    expectedBaseSha: RETRY_BASE_SHA
  }),
  /keys must be exact/
);

const alteredLaunch = copy(launch);
alteredLaunch.model = 'other-model';
assert.throws(
  () => validateKeplerM1ZeroSpendRetry({
    retry,
    launch: alteredLaunch,
    task,
    expectedBaseSha: RETRY_BASE_SHA
  }),
  /launch model mismatch/
);

console.log('KEPLER_M1_ZERO_SPEND_RETRY_GATE_SELFTEST=PASS');
