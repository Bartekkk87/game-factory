import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createTaskContract, sha256 } from './contracts.mjs';
import { initializeProjectWorkspace } from './manifest.mjs';
import { runPgA0Task } from './runner.mjs';

const ORIGINAL_VALUE = 'export const value = 1;\n';
const NEXT_VALUE = 'export const value = 2;\n';
const TASK_BRANCH = 'project-task/fixture/TASK-1';

function command(cwd, executable, args, { allowFailure = false } = {}) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8' });
  if (!allowFailure) {
    assert.equal(
      result.status,
      0,
      `${executable} ${args.join(' ')} failed: ${result.stderr || result.stdout}`
    );
  }
  return {
    status: result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim()
  };
}

function git(root, args, options = {}) {
  return command(root, 'git', args, options);
}

function initializeFixture({ withRemote = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-pg-a0-negative-'));
  const projectRoot = path.join(root, 'projects', 'fixture');
  let remoteRoot = null;

  const manifest = initializeProjectWorkspace(projectRoot, {
    projectId: 'fixture',
    ownerVision: 'Falsify PG-A0 trust and rollback boundaries.',
    requirements: [{ id: 'REQ-1', statement: 'The exported fixture value is two.' }],
    moduleGraph: { 'src/value.mjs': [] },
    testMap: { 'src/value.mjs': ['tests/unit.mjs', 'tests/integration.mjs', 'tests/regression.mjs'] }
  });
  fs.writeFileSync(path.join(projectRoot, 'src', 'value.mjs'), ORIGINAL_VALUE);
  fs.writeFileSync(
    path.join(projectRoot, 'milestones', 'M1.json'),
    `${JSON.stringify({ id: 'M1', title: 'Negative-test milestone' }, null, 2)}\n`
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

  const task = createTaskContract({
    taskId: 'TASK-1',
    projectId: manifest.projectId,
    milestoneId: 'M1',
    title: 'Promote fixture value',
    scope: {
      add: [],
      modify: ['src/value.mjs'],
      delete: [],
      protected: ['tests'],
      maxFilesChanged: 1
    },
    acceptance: [{ id: 'AC-TASK-1', statement: 'Fixture exports value two.' }],
    verification: {
      checks: [
        {
          id: 'unit-value',
          level: 'L2',
          kind: 'command',
          acceptanceIds: ['AC-TASK-1'],
          command: 'node tests/unit.mjs',
          invariantRef: null,
          regressionCapabilityIds: [],
          independent: true
        },
        {
          id: 'integration-value',
          level: 'L4',
          kind: 'command',
          acceptanceIds: ['AC-TASK-1'],
          command: 'node tests/integration.mjs',
          invariantRef: null,
          regressionCapabilityIds: [],
          independent: true
        },
        {
          id: 'regression-value',
          level: 'L5',
          kind: 'command',
          acceptanceIds: ['AC-TASK-1'],
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
      maxFiles: 10,
      maxBytes: 50000
    }
  });
  fs.writeFileSync(
    path.join(projectRoot, '.factory', 'tasks', `${task.taskId}.json`),
    `${JSON.stringify(task, null, 2)}\n`
  );

  git(root, ['init']);
  git(root, ['branch', '-M', 'main']);
  git(root, ['config', 'user.name', 'PG-A0 Negative Fixture']);
  git(root, ['config', 'user.email', 'pg-a0-negative@example.invalid']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'negative fixture baseline']);
  const baseHeadSha = git(root, ['rev-parse', 'HEAD']).stdout;

  if (withRemote) {
    remoteRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-pg-a0-remote-'));
    command(os.tmpdir(), 'git', ['init', '--bare', remoteRoot]);
    git(root, ['remote', 'add', 'origin', remoteRoot]);
    git(root, ['push', '-u', 'origin', 'main']);
  }

  return { root, projectRoot, task, baseHeadSha, verificationScript, remoteRoot };
}

function cleanupFixture(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
  if (fixture.remoteRoot) fs.rmSync(fixture.remoteRoot, { recursive: true, force: true });
}

function goodEngineerResult() {
  return {
    operations: [{
      operation: 'MODIFY',
      path: 'src/value.mjs',
      beforeSha256: sha256(Buffer.from(ORIGINAL_VALUE)),
      afterSha256: sha256(Buffer.from(NEXT_VALUE)),
      content: NEXT_VALUE
    }],
    modelEvidence: {
      provider: 'deterministic-negative-fixture',
      actualModel: 'zero-paid-negative-fixture',
      operation: 'project-task'
    }
  };
}

function runOptions(fixture, { requestEngineerPatch, fetchImpl, push = false } = {}) {
  return {
    repoRoot: fixture.root,
    projectRoot: fixture.projectRoot,
    taskId: fixture.task.taskId,
    ownerTaskContractSha256: fixture.task.contractSha256,
    requestEngineerPatch,
    repository: 'example/game-factory',
    token: 'fixture-token',
    fetchImpl,
    push,
    verifiedAt: '2026-08-30T08:30:00.000Z'
  };
}

function successPullFetch(fixture, { headSha = null, baseSha = null } = {}) {
  return async (_url, options) => {
    const posted = JSON.parse(options.body);
    const currentHead = git(fixture.root, ['rev-parse', 'HEAD']).stdout;
    return {
      ok: true,
      status: 201,
      json: async () => ({
        number: 88,
        html_url: 'https://github.example/pr/88',
        body: posted.body,
        draft: posted.draft,
        head: { sha: headSha || currentHead, ref: posted.head },
        base: { sha: baseSha || fixture.baseHeadSha, ref: posted.base }
      })
    };
  };
}

function assertRolledBack(fixture) {
  assert.equal(git(fixture.root, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout, 'main');
  assert.equal(git(fixture.root, ['rev-parse', 'HEAD']).stdout, fixture.baseHeadSha);
  assert.equal(git(fixture.root, ['status', '--porcelain', '--untracked-files=all']).stdout, '');
  assert.notEqual(
    git(fixture.root, ['show-ref', '--verify', '--quiet', `refs/heads/${TASK_BRANCH}`], { allowFailure: true }).status,
    0
  );
  assert.equal(fs.readFileSync(path.join(fixture.projectRoot, 'src', 'value.mjs'), 'utf8'), ORIGINAL_VALUE);
}

async function proveEngineerMutationFailsClosed() {
  const fixture = initializeFixture();
  const escapeFile = path.join(fixture.root, 'ENGINEER-ESCAPE.tmp');
  try {
    await assert.rejects(runPgA0Task(runOptions(fixture, {
      requestEngineerPatch: async (request) => {
        assert.equal(Object.isFrozen(request), true);
        assert.equal(Object.isFrozen(request.task.scope.modify), true);
        fs.writeFileSync(escapeFile, 'must be removed by rollback\n');
        return goodEngineerResult();
      },
      fetchImpl: successPullFetch(fixture)
    })), /mutated repository outside returned patch operations/);
    assertRolledBack(fixture);
    assert.equal(fs.existsSync(escapeFile), false);
  } finally {
    cleanupFixture(fixture);
  }
}

async function proveOutOfScopePatchFailsClosed() {
  const fixture = initializeFixture();
  try {
    const changedTest = `${fixture.verificationScript}// forbidden mutation\n`;
    await assert.rejects(runPgA0Task(runOptions(fixture, {
      requestEngineerPatch: async () => ({
        operations: [{
          operation: 'MODIFY',
          path: 'tests/unit.mjs',
          beforeSha256: sha256(Buffer.from(fixture.verificationScript)),
          afterSha256: sha256(Buffer.from(changedTest)),
          content: changedTest
        }],
        modelEvidence: goodEngineerResult().modelEvidence
      }),
      fetchImpl: successPullFetch(fixture)
    })));
    assertRolledBack(fixture);
  } finally {
    cleanupFixture(fixture);
  }
}

async function proveWrongPrHeadFailsClosed() {
  const fixture = initializeFixture();
  try {
    await assert.rejects(runPgA0Task(runOptions(fixture, {
      requestEngineerPatch: async () => goodEngineerResult(),
      fetchImpl: successPullFetch(fixture, { headSha: 'f'.repeat(40) })
    })), /head does not match bound Git head/);
    assertRolledBack(fixture);
  } finally {
    cleanupFixture(fixture);
  }
}

async function proveWrongPrBaseFailsClosed() {
  const fixture = initializeFixture();
  try {
    await assert.rejects(runPgA0Task(runOptions(fixture, {
      requestEngineerPatch: async () => goodEngineerResult(),
      fetchImpl: successPullFetch(fixture, { baseSha: 'e'.repeat(40) })
    })), /base head does not match bound base head/);
    assertRolledBack(fixture);
  } finally {
    cleanupFixture(fixture);
  }
}

async function proveRemotePushIsRolledBackOnGithubFailure() {
  const fixture = initializeFixture({ withRemote: true });
  try {
    await assert.rejects(runPgA0Task(runOptions(fixture, {
      requestEngineerPatch: async () => goodEngineerResult(),
      fetchImpl: async () => ({ ok: false, status: 503 }),
      push: true
    })), /GitHub task PR creation failed: HTTP 503/);
    assertRolledBack(fixture);
    assert.equal(git(fixture.root, ['ls-remote', '--heads', 'origin', TASK_BRANCH]).stdout, '');
    assert.notEqual(git(fixture.root, ['ls-remote', '--heads', 'origin', 'main']).stdout, '');
  } finally {
    cleanupFixture(fixture);
  }
}

await proveEngineerMutationFailsClosed();
await proveOutOfScopePatchFailsClosed();
await proveWrongPrHeadFailsClosed();
await proveWrongPrBaseFailsClosed();
await proveRemotePushIsRolledBackOnGithubFailure();

console.log('project PG-A0 negative trust-boundary selftest: PASS');
