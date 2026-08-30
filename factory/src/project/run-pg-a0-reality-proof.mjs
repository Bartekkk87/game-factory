import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sha256, validateTaskContract } from './contracts.mjs';
import {
  parseTaskPrBindingBody,
  validateTaskPrAuthorityRecord,
  validateTaskPrBinding
} from './git-task-pr.mjs';
import { runPgA0Task } from './runner.mjs';

const PROJECT_ID = 'pg-a0-reality';
const TASK_ID = 'TASK-REALITY-1';
const TASK_SHA256 = '165204ed3144b488061dfb36a43a3a610ca63956cc7d92078d4c3bb39d0fa032';
const BEFORE = 'export const value = 1;\n';
const AFTER = 'export const value = 2;\n';

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for the real PG-A0 proof`);
  return value;
}

async function githubGetPull(repository, number, token) {
  const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${number}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) throw new Error(`GitHub task PR readback failed: HTTP ${response.status}`);
  return response.json();
}

const repoRoot = path.resolve(process.cwd());
const projectRoot = path.join(repoRoot, 'projects', PROJECT_ID);
const taskPath = path.join(projectRoot, '.factory', 'tasks', `${TASK_ID}.json`);
const task = validateTaskContract(JSON.parse(fs.readFileSync(taskPath, 'utf8')));
assert.equal(task.contractSha256, TASK_SHA256);

const repository = requiredEnv('GITHUB_REPOSITORY');
const token = requiredEnv('GITHUB_TOKEN');

const result = await runPgA0Task({
  repoRoot,
  projectRoot,
  taskId: TASK_ID,
  baseBranch: 'main',
  repository,
  token,
  push: true,
  verifiedAt: '2026-08-30T12:00:00.000Z',
  requestEngineerPatch: async (request) => {
    assert.equal(request.manifest.projectId, PROJECT_ID);
    assert.equal(request.task.taskId, TASK_ID);
    assert.equal(request.task.contractSha256, TASK_SHA256);
    return {
      operations: [{
        operation: 'MODIFY',
        path: 'src/value.mjs',
        beforeSha256: sha256(Buffer.from(BEFORE)),
        afterSha256: sha256(Buffer.from(AFTER)),
        content: AFTER
      }],
      modelEvidence: {
        provider: 'deterministic-fixture',
        actualModel: 'zero-paid-engineer-fixture',
        operation: 'project-task'
      }
    };
  }
});

assert.equal(result.status, 'pr-open');
assert.equal(result.pullRequest.draft, false);

const livePull = await githubGetPull(repository, result.pullRequest.number, token);
const durable = parseTaskPrBindingBody(livePull.body);
validateTaskPrAuthorityRecord(durable, livePull);
validateTaskPrBinding(durable, {
  task,
  promotion: result.promotion,
  expectedHeadSha: livePull.head.sha
});

assert.equal(durable.projectId, PROJECT_ID);
assert.equal(durable.taskId, TASK_ID);
assert.equal(durable.taskContractSha256, TASK_SHA256);
assert.equal(durable.baselineTreeSha256, result.promotion.state.baseline.treeSha256);
assert.equal(durable.evidenceSha256, result.promotion.evidenceSha256);
assert.equal(durable.baseRef, livePull.base.ref);
assert.equal(durable.baseHeadSha, livePull.base.sha);
assert.equal(durable.headRef, livePull.head.ref);
assert.equal(durable.headSha, livePull.head.sha);
assert.equal(livePull.draft, false);

const proof = {
  schemaVersion: 'project-game.pg-a0-reality-proof/v1',
  status: 'PASS',
  zeroPaid: true,
  engineerProvider: 'deterministic-fixture',
  engineerModel: 'zero-paid-engineer-fixture',
  projectId: durable.projectId,
  taskId: durable.taskId,
  taskContractSha256: durable.taskContractSha256,
  baselineTreeSha256: durable.baselineTreeSha256,
  evidenceSha256: durable.evidenceSha256,
  baseRef: durable.baseRef,
  baseHeadSha: durable.baseHeadSha,
  headRef: durable.headRef,
  headSha: durable.headSha,
  pullRequestNumber: livePull.number,
  pullRequestUrl: livePull.html_url,
  draft: livePull.draft,
  authorityRevalidated: true
};

console.log(`PG_A0_REALITY_PROOF=${JSON.stringify(proof)}`);
