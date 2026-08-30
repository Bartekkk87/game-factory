import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createTaskContract, sha256 } from './contracts.mjs';
import { initializeProjectWorkspace } from './manifest.mjs';
import { runPgA0Task } from './runner.mjs';
import { validateTaskPrBinding } from './git-task-pr.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-pg-a0-'));
const projectRoot = path.join(root, 'projects', 'fixture');
const git = (args) => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return String(result.stdout || '').trim();
};

try {
  const manifest = initializeProjectWorkspace(projectRoot, {
    projectId: 'fixture',
    ownerVision: 'Prove one bounded PG-A0 task without a paid model call.',
    requirements: [{ id: 'REQ-1', statement: 'The exported fixture value is two.' }],
    moduleGraph: { 'src/value.mjs': [] },
    testMap: { 'src/value.mjs': ['tests/unit.mjs', 'tests/integration.mjs', 'tests/regression.mjs'] }
  });
  fs.writeFileSync(path.join(projectRoot, 'src', 'value.mjs'), 'export const value = 1;\n');
  fs.writeFileSync(
    path.join(projectRoot, 'milestones', 'M1.json'),
    `${JSON.stringify({ id: 'M1', title: 'Fixture milestone' }, null, 2)}\n`
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
          id: 'unit-value', level: 'L2', kind: 'command', acceptanceIds: ['AC-TASK-1'],
          command: 'node tests/unit.mjs', invariantRef: null, regressionCapabilityIds: [], independent: true
        },
        {
          id: 'integration-value', level: 'L4', kind: 'command', acceptanceIds: ['AC-TASK-1'],
          command: 'node tests/integration.mjs', invariantRef: null, regressionCapabilityIds: [], independent: true
        },
        {
          id: 'regression-value', level: 'L5', kind: 'command', acceptanceIds: ['AC-TASK-1'],
          command: 'node tests/regression.mjs', invariantRef: null, regressionCapabilityIds: [], independent: true
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

  git(['init']);
  git(['branch', '-M', 'main']);
  git(['config', 'user.name', 'PG-A0 Fixture']);
  git(['config', 'user.email', 'pg-a0@example.invalid']);
  git(['add', '.']);
  git(['commit', '-m', 'fixture baseline']);

  const newContent = 'export const value = 2;\n';
  let requestedContext = null;
  let postedBody = null;
  const result = await runPgA0Task({
    repoRoot: root,
    projectRoot,
    taskId: task.taskId,
    ownerTaskContractSha256: task.contractSha256,
    requestEngineerPatch: async (request) => {
      requestedContext = request.context;
      return {
        operations: [{
          operation: 'MODIFY',
          path: 'src/value.mjs',
          beforeSha256: sha256(Buffer.from('export const value = 1;\n')),
          afterSha256: sha256(Buffer.from(newContent)),
          content: newContent
        }],
        modelEvidence: {
          provider: 'deterministic-fixture',
          actualModel: 'zero-paid-engineer-fixture',
          operation: 'project-task'
        }
      };
    },
    repository: 'example/game-factory',
    token: 'fixture-token',
    push: false,
    verifiedAt: '2026-08-30T08:00:00.000Z',
    fetchImpl: async (_url, options) => {
      postedBody = JSON.parse(options.body);
      const headSha = git(['rev-parse', 'HEAD']);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          number: 77,
          html_url: 'https://github.example/pr/77',
          draft: postedBody.draft,
          head: { sha: headSha, ref: postedBody.head },
          base: { ref: postedBody.base }
        })
      };
    }
  });

  assert.equal(result.status, 'pr-open');
  assert.equal(result.pullRequest.draft, false);
  assert.equal(result.pullRequest.headSha, result.binding.headSha);
  assert.equal(result.binding.baselineTreeSha256, result.promotion.state.baseline.treeSha256);
  assert.equal(result.binding.evidenceSha256, result.promotion.evidenceSha256);
  assert.equal(requestedContext.taskId, task.taskId);
  assert.equal(requestedContext.taskContractSha256, task.contractSha256);
  assert.equal(postedBody.draft, false);
  assert.match(postedBody.body, new RegExp(result.binding.headSha));
  assert.match(postedBody.body, new RegExp(result.binding.baselineTreeSha256));
  assert.equal(fs.readFileSync(path.join(projectRoot, 'src', 'value.mjs'), 'utf8'), newContent);
  const committedFiles = git(['show', '--format=', '--name-only', 'HEAD']).split('\n').filter(Boolean);
  assert.ok(committedFiles.length > 0);
  assert.equal(committedFiles.every((file) => file.startsWith('projects/fixture/')), true);
  assert.equal(committedFiles.some((file) => file.startsWith('runtime-state/')), false);
  assert.throws(() => validateTaskPrBinding(result.binding, {
    task,
    promotion: result.promotion,
    expectedHeadSha: 'f'.repeat(40)
  }), /head moved/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('project PG-A0 zero-paid task PR selftest: PASS');
