import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createTaskContract,
  sha256
} from './contracts.mjs';
import { initializeProjectWorkspace } from './manifest.mjs';
import {
  createOwnerTaskApproval,
  validateOwnerTaskApproval
} from './owner-task-approval.mjs';
import { applyPatchToStaging } from './patch-contract.mjs';
import {
  comparePersistedState,
  createPersistenceContract,
  deriveCanonicalDurableState,
  runSaveReloadProof
} from './persistence-contract.mjs';
import { runPgA0Task } from './runner.mjs';
import {
  abortTaskTransaction,
  prepareTaskTransaction
} from './transaction.mjs';

const ORIGINAL_VALUE = 'export const value = 1;\n';
const NEXT_VALUE = 'export const value = 2;\n';

function taskFor(projectId = 'fixture', taskId = 'TASK-1') {
  return createTaskContract({
    taskId,
    projectId,
    milestoneId: 'M1',
    title: 'P1 closure fixture task',
    scope: {
      add: [],
      modify: ['src/value.mjs'],
      delete: [],
      protected: ['tests'],
      maxFilesChanged: 1
    },
    acceptance: [{ id: 'AC-P1-01', statement: 'Fixture value is updated safely.' }],
    verification: {
      checks: [
        {
          id: 'P1-UNIT',
          level: 'L2',
          kind: 'command',
          acceptanceIds: ['AC-P1-01'],
          command: 'node tests/unit.mjs',
          invariantRef: null,
          regressionCapabilityIds: [],
          independent: true
        },
        {
          id: 'P1-INT',
          level: 'L4',
          kind: 'command',
          acceptanceIds: ['AC-P1-01'],
          command: 'node tests/integration.mjs',
          invariantRef: null,
          regressionCapabilityIds: [],
          independent: true
        },
        {
          id: 'P1-REG',
          level: 'L5',
          kind: 'command',
          acceptanceIds: ['AC-P1-01'],
          command: 'node tests/regression.mjs',
          invariantRef: null,
          regressionCapabilityIds: [],
          independent: true
        }
      ]
    },
    context: {
      targetFiles: ['src/value.mjs'],
      dependencyRoots: [],
      testFiles: ['tests/unit.mjs', 'tests/integration.mjs', 'tests/regression.mjs'],
      decisionTags: [],
      lessonTags: [],
      maxFiles: 12,
      maxBytes: 50000
    }
  });
}

function initializeFixture(root, projectId = 'fixture') {
  const projectRoot = path.join(root, 'projects', projectId);
  initializeProjectWorkspace(projectRoot, {
    projectId,
    ownerVision: 'Prove P1 trust boundaries fail closed.',
    requirements: [{ id: 'REQ-P1', statement: 'Only authorized bounded changes may promote.' }]
  });
  fs.writeFileSync(path.join(projectRoot, 'src', 'value.mjs'), ORIGINAL_VALUE);
  fs.writeFileSync(
    path.join(projectRoot, 'milestones', 'M1.json'),
    `${JSON.stringify({ id: 'M1', title: 'P1 closure milestone' }, null, 2)}\n`
  );
  const verificationScript = [
    "import fs from 'node:fs';",
    "const source = fs.readFileSync(new URL('../src/value.mjs', import.meta.url), 'utf8');",
    "if (!source.includes('value = 2')) throw new Error('fixture value is not two');",
    ''
  ].join('\n');
  for (const name of ['unit.mjs', 'integration.mjs', 'regression.mjs']) {
    fs.writeFileSync(path.join(projectRoot, 'tests', name), verificationScript);
  }
  return projectRoot;
}

function writeTask(projectRoot, task) {
  fs.writeFileSync(
    path.join(projectRoot, '.factory', 'tasks', `${task.taskId}.json`),
    `${JSON.stringify(task, null, 2)}\n`
  );
}

function writeApproval(projectRoot, approval) {
  fs.writeFileSync(
    path.join(projectRoot, '.factory', 'approvals', `${approval.taskId}.json`),
    `${JSON.stringify(approval, null, 2)}\n`
  );
}

function approvedTask(projectRoot, task) {
  writeTask(projectRoot, task);
  const approval = createOwnerTaskApproval({
    projectId: task.projectId,
    taskId: task.taskId,
    taskContractSha256: task.contractSha256,
    approvedBy: 'owner-p1-regression',
    authorityVersion: 'owner-approval/v1'
  });
  writeApproval(projectRoot, approval);
  return approval;
}

function dummyEngineer() {
  throw new Error('Engineer must not be reached by an authorization negative test');
}

async function proveF1DurableOwnerApprovalBinding() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-p1-f1-'));
  const projectRoot = initializeFixture(root);
  try {
    const approved = taskFor();
    const approval = approvedTask(projectRoot, approved);

    const mutated = createTaskContract({
      ...approved,
      title: 'Task mutated after Owner approval'
    });
    assert.notEqual(mutated.contractSha256, approved.contractSha256);
    writeTask(projectRoot, mutated);

    let engineerCalled = false;
    await assert.rejects(
      runPgA0Task({
        repoRoot: root,
        projectRoot,
        taskId: mutated.taskId,
        requestEngineerPatch: async () => {
          engineerCalled = true;
          return dummyEngineer();
        },
        push: false
      }),
      /owner task approval contract mismatch/
    );
    assert.equal(engineerCalled, false);

    assert.throws(
      () => validateOwnerTaskApproval(approval, { projectId: 'other-project' }),
      /project mismatch/
    );
    assert.throws(
      () => validateOwnerTaskApproval(approval, { taskId: 'OTHER-TASK' }),
      /task mismatch/
    );
    assert.throws(
      () => validateOwnerTaskApproval(approval, { taskContractSha256: 'f'.repeat(64) }),
      /contract mismatch/
    );
    assert.throws(
      () => validateOwnerTaskApproval({ ...approval, bypass: true }, {
        projectId: approval.projectId,
        taskId: approval.taskId,
        taskContractSha256: approval.taskContractSha256
      }),
      /fields invalid/
    );

    writeTask(projectRoot, approved);
    fs.rmSync(path.join(projectRoot, '.factory', 'approvals', `${approved.taskId}.json`));
    await assert.rejects(
      runPgA0Task({
        repoRoot: root,
        projectRoot,
        taskId: approved.taskId,
        requestEngineerPatch: async () => dummyEngineer(),
        push: false
      }),
      /Owner approval record missing/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function modifyOperation() {
  return {
    operation: 'MODIFY',
    path: 'src/value.mjs',
    beforeSha256: sha256(Buffer.from(ORIGINAL_VALUE)),
    afterSha256: sha256(Buffer.from(NEXT_VALUE)),
    content: NEXT_VALUE
  };
}

function proveF2PrimitiveWorkspaceConfinement() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-p1-f2-'));
  const projectRoot = initializeFixture(root, 'expected-project');
  const otherRoot = initializeFixture(root, 'other-project');
  const task = taskFor('expected-project', 'TASK-F2');
  try {
    const tx = prepareTaskTransaction({
      projectRoot,
      task,
      operations: [modifyOperation()]
    });
    assert.equal(tx.projectRoot, fs.realpathSync(projectRoot));
    abortTaskTransaction(tx, 'p1-positive-boundary-proof');
    assert.equal(fs.readFileSync(path.join(projectRoot, 'src', 'value.mjs'), 'utf8'), ORIGINAL_VALUE);

    assert.throws(
      () => prepareTaskTransaction({ projectRoot: root, task, operations: [modifyOperation()] }),
      /repoRoot\/projects|inside repoRoot\/projects/
    );

    const sibling = path.join(root, 'sibling');
    fs.mkdirSync(sibling);
    const siblingSentinel = path.join(sibling, 'sentinel.txt');
    fs.writeFileSync(siblingSentinel, 'unchanged\n');
    assert.throws(
      () => prepareTaskTransaction({ projectRoot: sibling, task, operations: [modifyOperation()] }),
      /inside repoRoot\/projects/
    );
    assert.equal(fs.readFileSync(siblingSentinel, 'utf8'), 'unchanged\n');

    assert.throws(
      () => prepareTaskTransaction({ projectRoot: otherRoot, task, operations: [modifyOperation()] }),
      /exactly repoRoot\/projects\/expected-project/
    );
    assert.equal(fs.readFileSync(path.join(otherRoot, 'src', 'value.mjs'), 'utf8'), ORIGINAL_VALUE);

    assert.throws(
      () => applyPatchToStaging({
        projectRoot,
        task,
        operations: [modifyOperation()]
      }),
      /workspace authority missing/
    );
    assert.equal(fs.readFileSync(path.join(projectRoot, 'src', 'value.mjs'), 'utf8'), ORIGINAL_VALUE);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  const symlinkRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-p1-f2-symlink-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-p1-f2-outside-'));
  try {
    fs.mkdirSync(path.join(symlinkRoot, 'projects'), { recursive: true });
    fs.symlinkSync(outside, path.join(symlinkRoot, 'projects', 'expected-project'), 'dir');
    const task = taskFor('expected-project', 'TASK-F2-SYMLINK');
    assert.throws(
      () => prepareTaskTransaction({
        projectRoot: path.join(symlinkRoot, 'projects', 'expected-project'),
        task,
        operations: [modifyOperation()]
      }),
      /must not be a symlink/
    );
  } finally {
    fs.rmSync(symlinkRoot, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
}

async function proveF4CompleteCanonicalDurableState() {
  assert.throws(
    () => createPersistenceContract({
      schemaVersion: '1.0.0',
      maxBytes: 4096,
      equivalenceProjection: ['world.ticks']
    }),
    /equivalenceProjection is forbidden/
  );

  const contract = createPersistenceContract({
    schemaVersion: '1.0.0',
    slots: 2,
    maxBytes: 8192,
    transientStatePaths: ['ui.hover', 'ui.animationFrame']
  });
  const expected = {
    world: {
      ticks: 42,
      sector: { id: 'alpha', seed: 7 },
      fleet: [
        { id: 'ship-a', hp: 10 },
        { id: 'ship-b', hp: 8 }
      ]
    },
    inventory: {
      metal: 7,
      slots: ['ore', 'fuel', 'parts']
    },
    ui: {
      hover: 'ship-a',
      animationFrame: 99,
      selectedPanel: 'fleet'
    }
  };

  const canonical = deriveCanonicalDurableState(contract, expected);
  assert.equal(Object.hasOwn(canonical.ui, 'hover'), false);
  assert.equal(Object.hasOwn(canonical.ui, 'animationFrame'), false);
  assert.equal(canonical.ui.selectedPanel, 'fleet');

  const transientOnly = structuredClone(expected);
  transientOnly.ui.hover = 'ship-b';
  transientOnly.ui.animationFrame = 1000;
  assert.equal(comparePersistedState(contract, expected, transientOnly).pass, true);

  const missingDurable = structuredClone(expected);
  delete missingDurable.inventory.metal;
  assert.equal(comparePersistedState(contract, expected, missingDurable).pass, false);

  const nestedChanged = structuredClone(expected);
  nestedChanged.world.sector.seed = 8;
  assert.equal(comparePersistedState(contract, expected, nestedChanged).pass, false);

  const arrayChanged = structuredClone(expected);
  arrayChanged.world.fleet[1].hp = 7;
  assert.equal(comparePersistedState(contract, expected, arrayChanged).pass, false);

  const arrayElementRemoved = structuredClone(expected);
  arrayElementRemoved.inventory.slots.splice(1, 1);
  assert.equal(comparePersistedState(contract, expected, arrayElementRemoved).pass, false);

  let current = null;
  let saved = null;
  const lossyAdapter = {
    async createSession() {
      return {
        setState: async (state) => { current = structuredClone(state); },
        save: async () => {
          saved = structuredClone(current);
          delete saved.world.sector.seed;
        },
        close: async () => {}
      };
    },
    async reloadSession() {
      current = null;
      return {
        load: async () => { current = structuredClone(saved); },
        getState: async () => current,
        close: async () => {}
      };
    }
  };
  const lossyProof = await runSaveReloadProof({
    contract,
    adapter: lossyAdapter,
    slot: 0,
    state: expected
  });
  assert.equal(lossyProof.pass, false);
  assert.notEqual(lossyProof.expectedStateSha256, lossyProof.actualStateSha256);
}

await proveF1DurableOwnerApprovalBinding();
proveF2PrimitiveWorkspaceConfinement();
await proveF4CompleteCanonicalDurableState();

console.log('project P1 closure adversarial regression selftest: PASS');
