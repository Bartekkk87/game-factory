import assert from 'node:assert/strict';
import { KEPLER_M1_LAUNCH_AUTHORITY, validateKeplerM1Launch } from './kepler-launch-gate.mjs';

const BASE_SHA = 'a'.repeat(40);
const launch = {
  ...KEPLER_M1_LAUNCH_AUTHORITY,
  baseAuthoritySha: BASE_SHA
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

const evidence = validateKeplerM1Launch({ launch, task, expectedBaseSha: BASE_SHA });
assert.equal(evidence.projectId, 'kepler-outpost');
assert.equal(evidence.taskId, 'KEPLER-M1-T1');
assert.equal(evidence.model, 'deepseek/deepseek-chat-v3.1');
assert.equal(evidence.provider, 'openrouter');
assert.equal(evidence.budgetUsd, 0.05);
assert.equal(evidence.singleRun, true);
assert.deepEqual(evidence.scopeModify, task.scope.modify);

for (const [field, value] of [
  ['projectId', 'other-project'],
  ['taskId', 'OTHER-TASK'],
  ['taskContractSha256', 'b'.repeat(64)],
  ['provider', 'other-provider'],
  ['model', 'other-model'],
  ['budgetUsd', 0.06],
  ['singleRun', false]
]) {
  const bad = copy(launch);
  bad[field] = value;
  assert.throws(
    () => validateKeplerM1Launch({ launch: bad, task, expectedBaseSha: BASE_SHA }),
    /mismatch/
  );
}

const wrongBase = copy(launch);
wrongBase.baseAuthoritySha = 'b'.repeat(40);
assert.throws(
  () => validateKeplerM1Launch({ launch: wrongBase, task, expectedBaseSha: BASE_SHA }),
  /base authority mismatch/
);

const extraKey = copy(launch);
extraKey.fallbackModel = 'forbidden';
assert.throws(
  () => validateKeplerM1Launch({ launch: extraKey, task, expectedBaseSha: BASE_SHA }),
  /keys must be exact/
);

const wrongScope = copy(task);
wrongScope.scope.modify.push('src/forbidden.mjs');
assert.throws(
  () => validateKeplerM1Launch({ launch, task: wrongScope, expectedBaseSha: BASE_SHA }),
  /modify scope changed/
);

const mutableTask = copy(task);
mutableTask.immutable = false;
assert.throws(
  () => validateKeplerM1Launch({ launch, task: mutableTask, expectedBaseSha: BASE_SHA }),
  /must remain immutable/
);

console.log('KEPLER_M1_LAUNCH_GATE_SELFTEST=PASS');
