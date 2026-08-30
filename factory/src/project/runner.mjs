import fs from 'node:fs';
import path from 'node:path';
import { buildProjectContext } from './context-builder.mjs';
import { assertSha256, validateTaskContract } from './contracts.mjs';
import { loadProjectManifest } from './manifest.mjs';
import { commitVerifiedTransaction, prepareTaskTransaction } from './transaction.mjs';
import {
  prepareTaskGitBranch,
  publishTaskPullRequest,
  rollbackTaskGitBranch,
  validateTaskPrBinding
} from './git-task-pr.mjs';

function loadApprovedTask(projectRoot, manifest, taskId, ownerTaskContractSha256) {
  const safeTaskId = String(taskId || '').trim();
  const expectedSha = assertSha256(ownerTaskContractSha256, 'ownerTaskContractSha256');
  const taskFile = path.join(path.resolve(projectRoot), '.factory', 'tasks', `${safeTaskId}.json`);
  if (!fs.existsSync(taskFile)) throw new Error(`Owner-selected task missing: ${safeTaskId}`);
  const task = validateTaskContract(JSON.parse(fs.readFileSync(taskFile, 'utf8')), manifest);
  if (task.taskId !== safeTaskId) throw new Error('Owner-selected task file identity mismatch');
  if (task.contractSha256 !== expectedSha) throw new Error('Owner-selected task SHA does not match immutable task contract');
  return task;
}

function checkedEngineerResult(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.operations) || !result.operations.length) {
    throw new Error('Engineer must return scoped patch operations');
  }
  const modelEvidence = result.modelEvidence;
  if (!modelEvidence || typeof modelEvidence !== 'object') throw new Error('Engineer model evidence missing');
  for (const field of ['provider', 'actualModel', 'operation']) {
    if (!String(modelEvidence[field] || '').trim()) throw new Error(`Engineer model evidence missing ${field}`);
  }
  if (modelEvidence.operation !== 'project-task') throw new Error('Engineer operation evidence must be project-task');
  return { operations: result.operations, modelEvidence };
}

export async function runPgA0Task({
  repoRoot,
  projectRoot,
  taskId,
  ownerTaskContractSha256,
  requestEngineerPatch,
  baseBranch = 'main',
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN,
  fetchImpl = globalThis.fetch,
  push = true,
  verifiedAt
} = {}) {
  if (typeof requestEngineerPatch !== 'function') {
    throw new Error('PG-A0 requires an explicit Engineer patch requester; no implicit paid call is allowed');
  }
  const manifest = loadProjectManifest(projectRoot);
  const task = loadApprovedTask(projectRoot, manifest, taskId, ownerTaskContractSha256);
  const milestoneRef = `milestones/${task.milestoneId}.json`;
  const context = buildProjectContext({ projectRoot, manifest, task, milestoneRef });
  const gitContext = prepareTaskGitBranch({ repoRoot, projectRoot, task, baseBranch });

  let promotion = null;
  try {
    const engineer = checkedEngineerResult(await requestEngineerPatch(Object.freeze({ manifest, task, context })));
    const transaction = prepareTaskTransaction({ projectRoot, task, operations: engineer.operations });
    promotion = commitVerifiedTransaction(transaction, {
      modelEvidence: engineer.modelEvidence,
      operationEvidence: {
        operation: 'project-task',
        context: {
          schemaVersion: context.schemaVersion,
          selectionSha256: context.selectionSha256,
          selectedFileCount: context.selectedFileCount,
          selectedBytes: context.selectedBytes
        }
      },
      verifiedAt
    });
    if (promotion.status !== 'committed' || promotion.baselinePromoted !== true) {
      rollbackTaskGitBranch(gitContext);
      return Object.freeze({ status: 'aborted', taskId: task.taskId, promotion });
    }
    const published = await publishTaskPullRequest({
      gitContext,
      task,
      promotion,
      repository,
      token,
      fetchImpl,
      push
    });
    validateTaskPrBinding(published.binding, {
      task,
      promotion,
      expectedHeadSha: published.pullRequest.head.sha
    });
    return Object.freeze({
      status: 'pr-open',
      taskId: task.taskId,
      contextSelectionSha256: context.selectionSha256,
      promotion,
      binding: published.binding,
      pullRequest: {
        number: published.pullRequest.number,
        htmlUrl: published.pullRequest.html_url,
        draft: published.pullRequest.draft,
        headSha: published.pullRequest.head.sha,
        headRef: published.pullRequest.head.ref,
        baseRef: published.pullRequest.base.ref
      }
    });
  } catch (error) {
    rollbackTaskGitBranch(gitContext);
    throw error;
  }
}
