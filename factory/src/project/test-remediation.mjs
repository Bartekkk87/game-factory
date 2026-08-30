import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createTaskContract,
  sha256,
  validateProjectManifest,
  validateTaskContract
} from './contracts.mjs';
import { initializeProjectWorkspace } from './manifest.mjs';
import { createVerificationPlan } from './verification-plan.mjs';
import { evaluateVerificationExecution, runVerificationPlan } from './verification-runner.mjs';
import {
  abortTaskTransaction,
  commitVerifiedTransaction,
  prepareTaskTransaction,
  recoverProjectTransactions
} from './transaction.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-project-remediation-'));

function createProject(name) {
  const projectRoot = path.join(temp, 'projects', name);
  const manifest = initializeProjectWorkspace(projectRoot, {
    projectId: name,
    ownerVision: `Verify ${name} safely.`,
    requirements: [{ id: 'REQ-SAFE', statement: 'Only verified state is promoted.' }]
  });
  return { projectRoot, manifest };
}

function write(projectRoot, relative, content) {
  const file = path.join(projectRoot, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function task({ projectId, taskId, add = [], modify = [], unitCommand = 'node tests/unit.test.js' }) {
  return createTaskContract({
    taskId,
    projectId,
    milestoneId: 'M001',
    title: `Remediation ${taskId}`,
    scope: {
      add,
      modify,
      delete: [],
      protected: [],
      maxFilesChanged: Math.max(1, add.length + modify.length)
    },
    acceptance: [{ id: 'AC-SAFE-01', statement: 'Only deterministic PASS may promote.' }],
    verification: {
      checks: [
        { id: `UNIT-${taskId}`, level: 'L2', kind: 'command', command: unitCommand, acceptanceIds: ['AC-SAFE-01'] },
        { id: `INT-${taskId}`, level: 'L4', kind: 'command', command: 'node tests/integration.test.js', acceptanceIds: ['AC-SAFE-01'] },
        { id: `REG-${taskId}`, level: 'L5', kind: 'command', command: 'node tests/regression.test.js', acceptanceIds: ['AC-SAFE-01'] }
      ]
    },
    context: { targetFiles: [...add, ...modify], maxFiles: 20, maxBytes: 20000 }
  });
}

function commitEvidence() {
  return {
    modelEvidence: { provider: 'fixture', actualModel: 'none', operation: 'remediation-test' },
    operationEvidence: {
      operation: 'remediation-test',
      context: { selectionSha256: 'a'.repeat(64) }
    },
    verifiedAt: '2026-08-30T00:00:00.000Z'
  };
}

function installPassingTests(projectRoot) {
  write(projectRoot, 'tests/unit.test.js', 'console.log("unit pass");\n');
  write(projectRoot, 'tests/integration.test.js', 'console.log("integration pass");\n');
  write(projectRoot, 'tests/regression.test.js', 'console.log("regression pass");\n');
}

try {
  // Authority contracts reject unknown fields even if their declared hash is retained.
  {
    const { manifest } = createProject('contract-shape-canary');
    const shapedTask = task({
      projectId: 'contract-shape-canary',
      taskId: 'M001-T00',
      add: ['src/shape.js']
    });
    assert.throws(() => validateProjectManifest({ ...manifest, ownerOverride: true }), /fields invalid/);
    assert.throws(() => validateTaskContract({ ...shapedTask, acceptanceOverride: true }), /fields invalid/);
    assert.throws(() => validateTaskContract({
      ...shapedTask,
      scope: { ...shapedTask.scope, unrestricted: true }
    }), /scope fields invalid/);
  }

  // P0-1: fabricated result objects are rejected and real failing code is executed.
  {
    const { projectRoot } = createProject('verification-canary');
    installPassingTests(projectRoot);
    write(projectRoot, 'tests/broken.test.js', "await import('../src/broken.js');\n");
    const brokenTask = task({
      projectId: 'verification-canary',
      taskId: 'M001-T01',
      add: ['src/broken.js'],
      unitCommand: 'node tests/broken.test.js'
    });
    const invalidCode = 'export const broken = (((;\n';
    const operations = [{
      operation: 'ADD',
      path: 'src/broken.js',
      content: invalidCode,
      afterSha256: sha256(Buffer.from(invalidCode))
    }];
    const fabricated = brokenTask.verification.checks.map((check) => ({
      checkId: check.id,
      pass: true,
      evidenceSha256: 'f'.repeat(64),
      producer: 'a',
      verifier: 'b'
    }));
    const fabricatedTx = prepareTaskTransaction({ projectRoot, task: brokenTask, operations });
    const fabricatedResult = commitVerifiedTransaction(fabricatedTx, {
      ...commitEvidence(),
      verificationResults: fabricated
    });
    assert.equal(fabricatedResult.reason, 'caller-supplied-verificationResults-forbidden');
    assert.equal(fabricatedResult.baselinePromoted, false);
    assert.equal(fs.existsSync(path.join(projectRoot, 'src/broken.js')), false);

    const executedTx = prepareTaskTransaction({ projectRoot, task: brokenTask, operations });
    const executedResult = commitVerifiedTransaction(executedTx, commitEvidence());
    assert.equal(executedResult.reason, 'verification-failed');
    assert.equal(executedResult.verification.pass, false);
    assert.equal(fs.existsSync(path.join(projectRoot, 'src/broken.js')), false);
  }

  // Evidence is re-hashed when graded; post-run tampering cannot remain PASS.
  {
    const { projectRoot, manifest } = createProject('evidence-canary');
    installPassingTests(projectRoot);
    write(projectRoot, 'src/world.js', 'export const world = 1;\n');
    const evidenceTask = task({
      projectId: 'evidence-canary',
      taskId: 'M001-T02',
      modify: ['src/world.js']
    });
    const plan = createVerificationPlan({ manifest, task: evidenceTask });
    const execution = runVerificationPlan({ plan, manifest, projectRoot });
    assert.throws(() => evaluateVerificationExecution(plan, {
      ...execution,
      checks: [...execution.checks, execution.checks[0]]
    }), /duplicate checks/);
    const artifact = path.join(projectRoot, execution.checks[0].artifactPath);
    fs.appendFileSync(artifact, '\n');
    const graded = evaluateVerificationExecution(plan, execution);
    assert.equal(graded.pass, false);
    assert.match(graded.failures[0].detail, /SHA mismatch/);
  }

  // Recovery refuses a prepared transaction when its asserted baseline disappeared.
  {
    const { projectRoot, manifest } = createProject('missing-baseline-canary');
    const journals = path.join(path.dirname(projectRoot), '.missing-baseline-canary.transactions');
    const transactionId = 'missing-baseline';
    fs.mkdirSync(journals, { recursive: true });
    fs.writeFileSync(path.join(journals, `${transactionId}.json`), `${JSON.stringify({
      schemaVersion: 'project-game.transaction/v1',
      id: transactionId,
      taskId: 'M001-T08',
      projectId: manifest.projectId,
      manifestSha256: manifest.contractSha256,
      projectRoot,
      baselineBefore: 'a'.repeat(64),
      candidateAfter: 'b'.repeat(64),
      phase: 'prepared'
    })}\n`);
    fs.renameSync(projectRoot, `${projectRoot}.missing`);
    assert.throws(() => recoverProjectTransactions(projectRoot), /baseline missing/);
    fs.renameSync(`${projectRoot}.missing`, projectRoot);
  }

  // P0-2: journal-supplied absolute paths are rejected before any deletion or install.
  {
    const { projectRoot } = createProject('journal-canary');
    const victim = path.join(temp, 'unrelated-owner-data');
    const foreign = path.join(temp, 'foreign-tree');
    write(victim, 'important.txt', 'owner data');
    write(foreign, 'PWNED.txt', 'foreign data');
    const journals = path.join(path.dirname(projectRoot), '.journal-canary.transactions');
    fs.mkdirSync(journals, { recursive: true });
    fs.writeFileSync(path.join(journals, 'evil.json'), `${JSON.stringify({
      schemaVersion: 'project-game.transaction/v1',
      id: 'evil',
      taskId: 'M001-T03',
      projectRoot: '/some/other/project',
      staging: victim,
      backup: foreign,
      phase: 'prepared'
    })}\n`);
    assert.throws(() => recoverProjectTransactions(projectRoot), /journal fields invalid/);
    assert.equal(fs.readFileSync(path.join(victim, 'important.txt'), 'utf8'), 'owner data');
    assert.equal(fs.existsSync(path.join(projectRoot, 'PROJECT.json')), true);
  }

  // P0-3: a second task cannot enter while the first owns the project transaction lock.
  {
    const { projectRoot } = createProject('concurrency-canary');
    installPassingTests(projectRoot);
    const taskA = task({ projectId: 'concurrency-canary', taskId: 'M001-T04', add: ['src/a.js'] });
    const taskB = task({ projectId: 'concurrency-canary', taskId: 'M001-T05', add: ['src/b.js'] });
    const bodyA = 'export const a = 1;\n';
    const bodyB = 'export const b = 1;\n';
    const txA = prepareTaskTransaction({
      projectRoot,
      task: taskA,
      operations: [{ operation: 'ADD', path: 'src/a.js', content: bodyA, afterSha256: sha256(bodyA) }]
    });
    assert.throws(() => prepareTaskTransaction({
      projectRoot,
      task: taskB,
      operations: [{ operation: 'ADD', path: 'src/b.js', content: bodyB, afterSha256: sha256(bodyB) }]
    }), /project transaction locked/);
    abortTaskTransaction(txA, 'test-complete');
    assert.equal(fs.existsSync(path.join(projectRoot, 'PROJECT.json')), true);
    assert.equal(fs.existsSync(path.join(projectRoot, 'src/a.js')), false);
    const txB = prepareTaskTransaction({
      projectRoot,
      task: taskB,
      operations: [{ operation: 'ADD', path: 'src/b.js', content: bodyB, afterSha256: sha256(bodyB) }]
    });
    abortTaskTransaction(txB, 'test-complete');
  }

  // Final candidate SHA is checked after verification and immediately before swap.
  {
    const { projectRoot } = createProject('preswap-canary');
    installPassingTests(projectRoot);
    write(projectRoot, 'src/world.js', 'export const world = 1;\n');
    write(projectRoot, 'tests/mutate.test.js', [
      "import fs from 'node:fs';",
      "fs.appendFileSync('src/world.js', '// verification mutation\\n');"
    ].join('\n'));
    const mutationTask = task({
      projectId: 'preswap-canary',
      taskId: 'M001-T06',
      modify: ['src/world.js'],
      unitCommand: 'node tests/mutate.test.js'
    });
    const before = fs.readFileSync(path.join(projectRoot, 'src/world.js'), 'utf8');
    const after = 'export const world = 2;\n';
    const tx = prepareTaskTransaction({
      projectRoot,
      task: mutationTask,
      operations: [{
        operation: 'MODIFY',
        path: 'src/world.js',
        beforeSha256: sha256(before),
        afterSha256: sha256(after),
        content: after
      }]
    });
    const result = commitVerifiedTransaction(tx, commitEvidence());
    assert.equal(result.reason, 'candidate-drift-before-swap');
    assert.equal(fs.readFileSync(path.join(projectRoot, 'src/world.js'), 'utf8'), before);
  }

  // Missing durable state fails closed instead of silently creating a null baseline.
  {
    const { projectRoot } = createProject('state-canary');
    installPassingTests(projectRoot);
    fs.rmSync(path.join(projectRoot, '.factory/project-state.json'));
    const stateTask = task({ projectId: 'state-canary', taskId: 'M001-T07', add: ['src/state.js'] });
    const body = 'export const state = true;\n';
    const tx = prepareTaskTransaction({
      projectRoot,
      task: stateTask,
      operations: [{ operation: 'ADD', path: 'src/state.js', content: body, afterSha256: sha256(body) }]
    });
    const result = commitVerifiedTransaction(tx, commitEvidence());
    assert.equal(result.reason, 'project-state-invalid');
    assert.equal(result.baselinePromoted, false);
  }

  console.log('Project Game remediation adversarial selftest: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
