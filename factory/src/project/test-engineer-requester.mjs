import assert from 'node:assert/strict';
import { createProjectManifest, createTaskContract, sha256 } from './contracts.mjs';
import { normalizeProjectEngineerResponse, requestProjectEngineerPatch } from './engineer-requester.mjs';

const manifest = createProjectManifest({
  projectId: 'requester-test',
  ownerVision: 'Prove bounded Project Engineer response normalization.',
  requirements: [{ id: 'REQ-1', statement: 'Only the approved source file changes.' }],
  moduleGraph: { 'src/value.mjs': [] },
  testMap: { 'src/value.mjs': ['tests/unit.mjs'] }
});
const task = createTaskContract({
  taskId: 'TASK-1',
  projectId: manifest.projectId,
  milestoneId: 'M1',
  title: 'Change one bounded source file',
  scope: {
    add: [],
    modify: ['src/value.mjs'],
    delete: [],
    protected: ['tests'],
    maxFilesChanged: 1
  },
  acceptance: [{ id: 'AC-1', statement: 'The approved source file changes.' }],
  verification: {
    checks: [
      {
        id: 'unit', level: 'L2', kind: 'command', command: 'node tests/unit.mjs',
        acceptanceIds: ['AC-1'], invariantRef: null, regressionCapabilityIds: [], independent: true
      },
      {
        id: 'integration', level: 'L4', kind: 'command', command: 'node tests/integration.mjs',
        acceptanceIds: ['AC-1'], invariantRef: null, regressionCapabilityIds: [], independent: true
      },
      {
        id: 'regression', level: 'L5', kind: 'command', command: 'node tests/regression.mjs',
        acceptanceIds: ['AC-1'], invariantRef: null, regressionCapabilityIds: [], independent: true
      }
    ]
  },
  context: {
    targetFiles: ['src/value.mjs'],
    dependencyRoots: [],
    testFiles: ['tests/unit.mjs'],
    decisionTags: [],
    lessonTags: [],
    maxFiles: 10,
    maxBytes: 10000
  }
});
const before = 'export const value = 1;\n';
const request = {
  manifest,
  task,
  context: {
    schemaVersion: 'project-game.context-selection/v1',
    taskId: task.taskId,
    taskContractSha256: task.contractSha256,
    selectionSha256: 'a'.repeat(64),
    included: [{
      path: 'src/value.mjs',
      reason: 'target-or-dependency',
      sha256: sha256(Buffer.from(before)),
      content: before
    }]
  }
};
const after = 'export const value = 2;\n';
const normalized = normalizeProjectEngineerResponse({
  request,
  payload: { operations: [{ operation: 'MODIFY', path: 'src/value.mjs', content: after }] },
  modelEvidence: { provider: 'fixture', actualModel: 'fixture-model' }
});
assert.equal(normalized.operations[0].beforeSha256, sha256(Buffer.from(before)));
assert.equal(normalized.operations[0].afterSha256, sha256(Buffer.from(after)));
assert.equal(normalized.modelEvidence.operation, 'project-task');

assert.throws(() => normalizeProjectEngineerResponse({
  request,
  payload: { operations: [{ operation: 'MODIFY', path: 'tests/unit.mjs', content: 'process.exit(0);\n' }] },
  modelEvidence: { provider: 'fixture', actualModel: 'fixture-model' }
}), /outside exact task scope/);

assert.throws(() => normalizeProjectEngineerResponse({
  request,
  payload: { operations: [
    { operation: 'MODIFY', path: 'src/value.mjs', content: after },
    { operation: 'MODIFY', path: 'src/value.mjs', content: after }
  ] },
  modelEvidence: { provider: 'fixture', actualModel: 'fixture-model' }
}), /operation count invalid|duplicate/);

let captured = null;
const viaChat = await requestProjectEngineerPatch(request, {
  chatImpl: async (input) => {
    captured = input;
    return {
      text: JSON.stringify({ operations: [{ operation: 'MODIFY', path: 'src/value.mjs', content: after }] }),
      provider: 'fixture',
      actualModel: 'fixture-model'
    };
  }
});
assert.equal(captured.role, 'engineer');
assert.equal(captured.operation, 'project-task');
assert.equal(captured.json, true);
assert.equal(viaChat.operations[0].content, after);

console.log('Project Engineer requester selftest: PASS');
