import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTaskContract, sha256, validateTaskContract } from './contracts.mjs';
import { initializeProjectWorkspace, loadProjectManifest, projectWorkspaceLayout } from './manifest.mjs';
import { buildProjectContext } from './context-builder.mjs';
import { captureProjectTree } from './file-state.mjs';
import { loadProjectState } from './project-state.mjs';
import { createVerificationPlan } from './verification-plan.mjs';
import { createPersistenceContract, runSaveReloadProof } from './persistence-contract.mjs';
import { createContentSchema, validateContentRecords } from './content-schema.mjs';
import {
  abortTaskTransaction,
  commitVerifiedTransaction,
  prepareTaskTransaction,
  recoverProjectTransactions
} from './transaction.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-project-foundation-'));
const projectRoot = path.join(temp, 'projects', 'canary');

function write(relative, content) {
  const file = path.join(projectRoot, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function taskContract({ taskId, title, add = [], modify = [], checks = null, maxFiles = 10, maxBytes = 20000 }) {
  return createTaskContract({
    taskId,
    projectId: 'canary',
    milestoneId: 'M001',
    title,
    scope: { add, modify, delete: [], protected: ['src/save'], maxFilesChanged: Math.max(1, add.length + modify.length) },
    acceptance: [{ id: 'AC-WORLD-01', statement: 'World counter changes deterministically.' }],
    verification: {
      checks: checks || [
        { id: 'UNIT-WORLD', level: 'L2', kind: 'command', command: 'node tests/world.test.js', acceptanceIds: ['AC-WORLD-01'] },
        { id: 'INT-WORLD', level: 'L4', kind: 'command', command: 'node tests/integration.test.js', acceptanceIds: ['AC-WORLD-01'] },
        { id: 'REG-WORLD', level: 'L5', kind: 'command', command: 'node tests/regression.test.js', acceptanceIds: ['AC-WORLD-01'] }
      ]
    },
    context: {
      targetFiles: ['src/world.js'],
      dependencyRoots: [],
      testFiles: ['tests/world.test.js'],
      decisionTags: ['simulation'],
      lessonTags: [],
      maxFiles,
      maxBytes
    }
  });
}

function passingResults(task) {
  return task.verification.checks.map((check) => ({
    checkId: check.id,
    pass: true,
    evidenceSha256: sha256(`evidence:${task.taskId}:${check.id}`),
    detail: 'deterministic fixture PASS',
    runner: 'node',
    producer: 'engineer',
    verifier: 'deterministic-runner'
  }));
}

try {
  const manifest = initializeProjectWorkspace(projectRoot, {
    projectId: 'canary',
    ownerVision: 'Build a persistent deterministic sci-fi survival project.',
    requirements: [{ id: 'PC-WORLD', statement: 'World simulation is deterministic.' }],
    noGos: ['Do not regenerate the whole project for a normal task.'],
    invariants: ['produced = stored + consumed + inTransit + explicitLosses'],
    moduleGraph: { 'src/world.js': ['src/state.js'] },
    testMap: { 'src/world.js': ['tests/world.test.js', 'tests/regression.test.js'] },
    contentSchemas: ['data/resources.schema.json']
  });
  const customRoot = path.join(temp, 'projects', 'custom-layout');
  initializeProjectWorkspace(customRoot, {
    projectId: 'custom-layout',
    ownerVision: 'Prove custom source and output separation.',
    requirements: [{ id: 'PC-LAYOUT', statement: 'Custom layout is deterministic.' }],
    sourceDir: 'game-src',
    buildDir: 'dist-web',
    testsDir: 'spec'
  });
  assert.equal(fs.statSync(path.join(customRoot, 'game-src')).isDirectory(), true);
  assert.equal(fs.statSync(path.join(customRoot, 'dist-web')).isDirectory(), true);
  assert.equal(fs.statSync(path.join(customRoot, 'spec')).isDirectory(), true);
  assert.equal(loadProjectManifest(projectRoot).contractSha256, manifest.contractSha256);
  assert.notEqual(projectWorkspaceLayout().editableSource, projectWorkspaceLayout().buildOutput);

  write('src/world.js', 'export const world = { ticks: 0 };\n');
  write('src/state.js', 'export const seed = 7;\n');
  write('tests/world.test.js', 'export const worldTest = true;\n');
  write('tests/regression.test.js', 'export const regressionTest = true;\n');
  write('tests/integration.test.js', 'export const integrationTest = true;\n');
  write('milestones/M001.json', `${JSON.stringify({ id: 'M001', title: 'World baseline' }, null, 2)}\n`);
  write('decisions/ADR-001.json', `${JSON.stringify({ id: 'ADR-001', tags: ['simulation'], decision: 'Fixed-step simulation.' }, null, 2)}\n`);

  const firstTask = taskContract({ taskId: 'M001-T01', title: 'Increment world ticks', add: ['tests/world-added.test.js'], modify: ['src/world.js'] });
  write(`.factory/tasks/${firstTask.taskId}.json`, `${JSON.stringify(firstTask, null, 2)}\n`);
  const context = buildProjectContext({ projectRoot, manifest, task: firstTask, milestoneRef: 'milestones/M001.json' });
  assert.equal(context.included.some((item) => item.path === 'src/state.js'), true, 'dependency closure must be selected');
  assert.equal(context.included.some((item) => item.path === 'decisions/ADR-001.json'), true, 'tagged project memory must be selected');
  assert.ok(context.selectedFileCount <= context.bounds.maxFiles);
  assert.ok(context.selectedBytes <= context.bounds.maxBytes);
  assert.match(context.selectionSha256, /^[0-9a-f]{64}$/);
  const boundedOutTask = taskContract({ taskId: 'M001-T00', title: 'Reject missing authority context', maxFiles: 1, maxBytes: 10 });
  write(`.factory/tasks/${boundedOutTask.taskId}.json`, `${JSON.stringify(boundedOutTask, null, 2)}\n`);
  assert.throws(() => buildProjectContext({ projectRoot, manifest, task: boundedOutTask, milestoneRef: 'milestones/M001.json' }), /bounds exclude required authority/);

  const oldWorld = fs.readFileSync(path.join(projectRoot, 'src/world.js'), 'utf8');
  const newWorld = 'export const world = { ticks: 1 };\n';
  const addedTest = 'export const addedWorldTest = true;\n';
  const transaction = prepareTaskTransaction({
    projectRoot,
    task: firstTask,
    operations: [
      { operation: 'MODIFY', path: 'src/world.js', beforeSha256: sha256(Buffer.from(oldWorld)), afterSha256: sha256(Buffer.from(newWorld)), content: newWorld },
      { operation: 'ADD', path: 'tests/world-added.test.js', beforeSha256: null, afterSha256: sha256(Buffer.from(addedTest)), content: addedTest }
    ]
  });
  assert.equal(transaction.patchEvidence.filesChanged.length, 2);
  assert.equal(fs.readFileSync(path.join(projectRoot, 'src/world.js'), 'utf8'), oldWorld, 'staging must not mutate verified baseline');
  const committed = commitVerifiedTransaction(transaction, {
    verificationResults: passingResults(firstTask),
    modelEvidence: { provider: 'fixture', requestedModel: 'none', actualModel: 'none', operation: 'scoped-task' },
    operationEvidence: { operation: 'scoped-task', context: { selectionSha256: context.selectionSha256 } },
    capabilities: [{ id: 'CAP-WORLD', taskId: firstTask.taskId, statement: 'World ticks deterministically.' }],
    regressions: [{ checkId: 'REG-WORLD', capabilityId: 'CAP-WORLD', protectedPaths: ['tests/regression.test.js'] }],
    saveSchemaVersion: '1.0.0',
    buildVersion: '0.1.0',
    verifiedAt: '2026-08-29T20:00:00.000Z'
  });
  assert.equal(committed.status, 'committed');
  assert.equal(fs.readFileSync(path.join(projectRoot, 'src/world.js'), 'utf8'), newWorld);
  const reloadedState = loadProjectState(projectRoot, manifest.projectId, { create: false });
  assert.equal(reloadedState.baseline.taskId, firstTask.taskId);
  assert.equal(reloadedState.verifiedCapabilities.some((item) => item.id === 'CAP-WORLD'), true);
  assert.equal(reloadedState.regressions.some((item) => item.checkId === 'REG-WORLD'), true);

  const secondTask = taskContract({ taskId: 'M001-T02', title: 'Rejected change', modify: ['src/world.js'] });
  const secondBefore = fs.readFileSync(path.join(projectRoot, 'src/world.js'), 'utf8');
  const secondAfter = 'export const world = { ticks: 999 };\n';
  const failedTransaction = prepareTaskTransaction({
    projectRoot,
    task: secondTask,
    operations: [{ operation: 'MODIFY', path: 'src/world.js', beforeSha256: sha256(Buffer.from(secondBefore)), afterSha256: sha256(Buffer.from(secondAfter)), content: secondAfter }]
  });
  const failedResults = passingResults(secondTask).map((result, index) => index === 0 ? { ...result, pass: false } : result);
  const rejected = commitVerifiedTransaction(failedTransaction, { verificationResults: failedResults });
  assert.equal(rejected.baselinePromoted, false);
  assert.equal(fs.readFileSync(path.join(projectRoot, 'src/world.js'), 'utf8'), secondBefore);

  const missingEvidenceTransaction = prepareTaskTransaction({
    projectRoot,
    task: secondTask,
    operations: [{ operation: 'MODIFY', path: 'src/world.js', beforeSha256: sha256(Buffer.from(secondBefore)), afterSha256: sha256(Buffer.from(secondAfter)), content: secondAfter }]
  });
  const missingEvidence = commitVerifiedTransaction(missingEvidenceTransaction, { verificationResults: passingResults(secondTask) });
  assert.equal(missingEvidence.reason, 'model-evidence-missing');
  assert.equal(missingEvidence.baselinePromoted, false);

  assert.throws(() => prepareTaskTransaction({
    projectRoot,
    task: secondTask,
    operations: [{ operation: 'ADD', path: 'src/scope-escape.js', afterSha256: sha256('escape'), content: 'escape' }]
  }), /scope escape/);
  assert.throws(() => createTaskContract({
    ...secondTask,
    taskId: 'M001-T03',
    scope: { ...secondTask.scope, modify: ['PROJECT.json'] }
  }), /reserved project authority/);
  const tampered = structuredClone(secondTask);
  tampered.title = 'Acceptance drift';
  assert.throws(() => validateTaskContract(tampered), /contract hash mismatch/);
  const buildOutputTask = taskContract({ taskId: 'M001-T03B', title: 'Reject build output mutation', add: ['build/generated.js'] });
  assert.throws(() => validateTaskContract(buildOutputTask, manifest), /reproducible build output/);
  assert.throws(() => createTaskContract({
    ...secondTask,
    taskId: 'M001-T03C',
    verification: {
      checks: secondTask.verification.checks.map((check) => check.level === 'L5' ? { ...check, independent: false } : check)
    }
  }), /must use independent evidence/);

  const missingRegressionTask = taskContract({
    taskId: 'M001-T04',
    title: 'Missing regression',
    modify: ['src/world.js'],
    checks: [
      { id: 'UNIT-WORLD-2', level: 'L2', kind: 'command', command: 'node unit', acceptanceIds: ['AC-WORLD-01'] },
      { id: 'INT-WORLD-2', level: 'L4', kind: 'command', command: 'node integration', acceptanceIds: ['AC-WORLD-01'] },
      { id: 'REG-OTHER', level: 'L5', kind: 'command', command: 'node regression', acceptanceIds: ['AC-WORLD-01'] }
    ]
  });
  assert.throws(() => createVerificationPlan({ manifest, task: missingRegressionTask, projectState: reloadedState }), /omits verified regression/);
  const fixtureRewriteTask = taskContract({
    taskId: 'M001-T05',
    title: 'Reject inherited fixture rewrite',
    modify: ['tests/regression.test.js'],
    checks: [
      { id: 'UNIT-WORLD-3', level: 'L2', kind: 'command', command: 'node unit', acceptanceIds: ['AC-WORLD-01'] },
      { id: 'INT-WORLD-3', level: 'L4', kind: 'command', command: 'node integration', acceptanceIds: ['AC-WORLD-01'] },
      { id: 'REG-WORLD', level: 'L5', kind: 'command', command: 'node tests/regression.test.js', acceptanceIds: ['AC-WORLD-01'] }
    ]
  });
  assert.throws(() => createVerificationPlan({ manifest, task: fixtureRewriteTask, projectState: reloadedState }), /overlaps inherited regression fixture/);

  const saveContract = createPersistenceContract({ schemaVersion: '1.0.0', slots: 2, maxBytes: 4096, equivalenceProjection: ['world.ticks', 'inventory.metal'] });
  let saved = null;
  let current = null;
  const adapter = {
    async createSession() {
      return { setState: async (value) => { current = structuredClone(value); }, save: async () => { saved = structuredClone(current); }, close: async () => {} };
    },
    async reloadSession() {
      current = null;
      return { load: async () => { current = structuredClone(saved); }, getState: async () => current, close: async () => {} };
    }
  };
  const saveProof = await runSaveReloadProof({ contract: saveContract, adapter, slot: 0, state: { world: { ticks: 42 }, inventory: { metal: 7 }, transient: 'ignored' } });
  assert.equal(saveProof.pass, true);

  const resourceSchema = createContentSchema({ id: 'resources', version: '1.0.0', fields: { id: { type: 'string', required: true }, stock: { type: 'integer', required: true } } });
  assert.equal(validateContentRecords(resourceSchema, [{ id: 'metal', stock: 4 }]).pass, true);
  assert.equal(validateContentRecords(resourceSchema, [{ id: 'metal', stock: 'four' }]).pass, false);

  const beforeRecovery = captureProjectTree(projectRoot).treeSha256;
  const txDir = path.join(path.dirname(projectRoot), '.canary.transactions');
  const backup = path.join(txDir, 'crash.backup');
  const staging = path.join(txDir, 'crash.staging');
  fs.mkdirSync(txDir, { recursive: true });
  fs.renameSync(projectRoot, backup);
  fs.writeFileSync(path.join(txDir, 'crash.json'), `${JSON.stringify({ id: 'crash', projectRoot, staging, backup, phase: 'swapping' }, null, 2)}\n`);
  const recovery = recoverProjectTransactions(projectRoot);
  assert.deepEqual(recovery, [{ id: 'crash', action: 'rolled-back' }]);
  assert.equal(captureProjectTree(projectRoot).treeSha256, beforeRecovery);

  const aborted = prepareTaskTransaction({
    projectRoot,
    task: secondTask,
    operations: [{ operation: 'MODIFY', path: 'src/world.js', beforeSha256: sha256(Buffer.from(secondBefore)), afterSha256: sha256(Buffer.from(secondAfter)), content: secondAfter }]
  });
  assert.equal(abortTaskTransaction(aborted).baselinePromoted, false);

  console.log('Project Game Foundation deterministic selftest: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
