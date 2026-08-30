import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { buildProjectContext } from './context-builder.mjs';
import { captureProjectTree } from './file-state.mjs';
import { sha256, validateTaskContract } from './contracts.mjs';
import { loadProjectManifest } from './manifest.mjs';
import { loadOwnerTaskApproval } from './owner-task-approval.mjs';
import { loadProjectState } from './project-state.mjs';
import { commitVerifiedTransaction, prepareTaskTransaction } from './transaction.mjs';
import {
  assertGitCommitSha,
  createTaskPrBinding,
  parseTaskPrBindingBody,
  taskPrBindingBody,
  validateTaskPrAuthorityRecord,
  validateTaskPrBinding
} from './git-task-pr.mjs';

function git(args, cwd, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr || result.stdout || '').trim()}`);
  }
  return {
    status: result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim()
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function projectRepoPath(repoRoot, projectRoot, projectId) {
  const relative = path.relative(path.resolve(repoRoot), path.resolve(projectRoot)).split(path.sep).join('/');
  if (!relative || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error('project root must be inside repository');
  }
  if (relative !== `projects/${projectId}`) {
    throw new Error(`PG-A0 project root must be projects/${projectId}`);
  }
  return relative;
}

function treeOptions(manifest) {
  return {
    excludes: [
      manifest.layout.buildDir,
      '.factory/evidence',
      '.factory/verification',
      '.factory/project-state.json',
      '.factory/transactions'
    ]
  };
}

function prepareTaskGitBranch({ repoRoot, projectRoot, task, baseBranch }) {
  const checkedTask = validateTaskContract(task);
  const root = path.resolve(repoRoot);
  const gitRoot = path.resolve(git(['rev-parse', '--show-toplevel'], root).stdout);
  if (gitRoot !== root) throw new Error('PG-A0 repoRoot must be the Git repository root');
  const projectPath = projectRepoPath(root, projectRoot, checkedTask.projectId);
  git(['check-ref-format', '--branch', baseBranch], root);
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root).stdout;
  if (currentBranch !== baseBranch) throw new Error(`PG-A0 must start on ${baseBranch}, found ${currentBranch}`);
  if (git(['status', '--porcelain', '--untracked-files=all'], root).stdout) {
    throw new Error('PG-A0 requires a clean repository before task execution');
  }
  const baseHeadSha = assertGitCommitSha(git(['rev-parse', 'HEAD'], root).stdout, 'base Git head');
  const remoteBase = git(
    ['show-ref', '--verify', '--hash', `refs/remotes/origin/${baseBranch}`],
    root,
    { allowFailure: true }
  );
  if (remoteBase.status === 0
    && assertGitCommitSha(remoteBase.stdout, 'origin base Git head') !== baseHeadSha) {
    throw new Error('local base head does not match origin base head');
  }
  const branchName = `project-task/${checkedTask.projectId}/${checkedTask.taskId}`;
  const existing = git(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], root, { allowFailure: true });
  if (existing.status === 0) throw new Error(`task branch already exists: ${branchName}`);
  git(['switch', '-c', branchName], root);
  return { root, projectPath, baseBranch, baseHeadSha, branchName, remotePushed: false };
}

function assertGitBaseUnchanged(context, { requireClean = false } = {}) {
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], context.root).stdout;
  if (currentBranch !== context.branchName) throw new Error('task Git branch changed outside runner authority');
  const currentHead = assertGitCommitSha(git(['rev-parse', 'HEAD'], context.root).stdout, 'task Git current head');
  if (currentHead !== context.baseHeadSha) throw new Error('task Git head changed outside runner authority');
  if (git(['diff', '--cached', '--name-only'], context.root).stdout) {
    throw new Error('task Git index changed outside runner authority');
  }
  if (requireClean && git(['status', '--porcelain', '--untracked-files=all'], context.root).stdout) {
    throw new Error('Engineer requester mutated repository outside returned patch operations');
  }
}

function assertTaskGitContext(context, task) {
  const expectedProjectPath = projectRepoPath(
    context.root,
    path.join(context.root, context.projectPath),
    task.projectId
  );
  if (expectedProjectPath !== context.projectPath) throw new Error('task Git project path changed');
  const expectedBranch = `project-task/${task.projectId}/${task.taskId}`;
  if (context.branchName !== expectedBranch) throw new Error('task Git branch identity changed');
  assertGitCommitSha(context.baseHeadSha, 'task Git base head');
  assertGitBaseUnchanged(context);
}

function loadPromotedEvidence(projectRoot, task, promotion) {
  const evidenceDir = path.join(projectRoot, '.factory', 'evidence', task.taskId);
  if (!fs.existsSync(evidenceDir) || !fs.statSync(evidenceDir).isDirectory()) {
    throw new Error('promoted task evidence directory missing');
  }
  const matches = fs.readdirSync(evidenceDir)
    .filter((entry) => entry.endsWith('.json'))
    .sort()
    .flatMap((entry) => {
      const file = path.join(evidenceDir, entry);
      const content = fs.readFileSync(file);
      return sha256(content) === promotion.evidenceSha256 ? [{ entry, content }] : [];
    });
  if (matches.length !== 1) throw new Error('promoted task evidence identity is not unique');
  const evidence = JSON.parse(matches[0].content.toString('utf8'));
  if (evidence.taskId !== task.taskId || evidence.taskContractSha256 !== task.contractSha256) {
    throw new Error('promoted task evidence task identity mismatch');
  }
  if (evidence.baselineAfter !== promotion.state.baseline.treeSha256 || evidence.result !== 'PASS') {
    throw new Error('promoted task evidence baseline identity mismatch');
  }
  if (!Array.isArray(evidence.filesChanged) || !evidence.filesChanged.length) {
    throw new Error('promoted task evidence filesChanged missing');
  }
  return Object.freeze({ entry: matches[0].entry, evidence });
}

function validatePromotedWorkspace(context, task, promotion) {
  if (promotion?.status !== 'committed' || promotion?.baselinePromoted !== true) {
    throw new Error('task PR requires a committed verified baseline');
  }
  if (promotion?.state?.baseline?.taskId !== task.taskId) {
    throw new Error('promoted baseline task mismatch');
  }
  const projectRoot = path.join(context.root, context.projectPath);
  const manifest = loadProjectManifest(projectRoot);
  validateTaskContract(task, manifest);
  const actualTree = captureProjectTree(projectRoot, treeOptions(manifest));
  if (actualTree.treeSha256 !== promotion.state.baseline.treeSha256) {
    throw new Error('promoted workspace tree changed before Git commit');
  }
  const actualState = loadProjectState(projectRoot, manifest.projectId, { create: false });
  if (!isDeepStrictEqual(actualState, promotion.state)) {
    throw new Error('promoted project state changed before Git commit');
  }
  const evidence = loadPromotedEvidence(projectRoot, task, promotion);
  const taskPaths = new Set([...task.scope.add, ...task.scope.modify, ...task.scope.delete]);
  const changedPaths = evidence.evidence.filesChanged.map((item) => String(item?.path || ''));
  if (changedPaths.some((file) => !taskPaths.has(file))) {
    throw new Error('promoted evidence contains file outside approved task scope');
  }
  return Object.freeze({
    changedPaths,
    evidencePath: `${context.projectPath}/.factory/evidence/${task.taskId}/${evidence.entry}`,
    statePath: `${context.projectPath}/.factory/project-state.json`
  });
}

function stagePromotedWorkspace(context, promoted) {
  const intended = new Set([
    ...promoted.changedPaths.map((file) => `${context.projectPath}/${file}`),
    promoted.evidencePath,
    promoted.statePath
  ]);
  git(['add', '-A', '--', ...intended], context.root);
  const staged = git(['diff', '--cached', '--name-only'], context.root).stdout.split('\n').filter(Boolean);
  if (!staged.length) throw new Error('verified baseline produced no Git changes');
  if (staged.some((file) => !intended.has(file))) {
    throw new Error('task commit contains path outside verified promotion');
  }
  for (const file of intended) {
    if (!staged.includes(file)) throw new Error(`verified promotion path was not staged: ${file}`);
  }
}

async function githubFailureDetail(response) {
  if (typeof response?.json !== 'function') return '';
  try {
    const payload = await response.json();
    if (typeof payload?.message !== 'string') return '';
    return payload.message.replace(/\s+/g, ' ').trim().slice(0, 300);
  } catch {
    return '';
  }
}

async function githubCreatePr({ repository, token, context, task, binding, fetchImpl }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repository || ''))) {
    throw new Error('GITHUB_REPOSITORY owner/name is required');
  }
  if (!String(token || '').trim()) throw new Error('GITHUB_TOKEN is required to create task PR');
  if (typeof fetchImpl !== 'function') throw new Error('task PR fetch implementation missing');
  const response = await fetchImpl(`https://api.github.com/repos/${repository}/pulls`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      title: `[Project ${task.projectId}] ${task.taskId}: ${task.title}`,
      body: taskPrBindingBody(binding),
      head: context.branchName,
      base: context.baseBranch,
      draft: false
    })
  });
  if (!response.ok) {
    const detail = await githubFailureDetail(response);
    throw new Error(`GitHub task PR creation failed: HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
}

async function publishVerifiedTask({ context, task, promotion, repository, token, fetchImpl, push }) {
  assertTaskGitContext(context, task);
  const promoted = validatePromotedWorkspace(context, task, promotion);
  stagePromotedWorkspace(context, promoted);
  git(['commit', '-m', `project(${task.projectId}): ${task.taskId} ${task.title}`], context.root);
  const headSha = assertGitCommitSha(git(['rev-parse', 'HEAD'], context.root).stdout, 'task Git head');
  const binding = createTaskPrBinding({
    task,
    promotion,
    baseRef: context.baseBranch,
    baseHeadSha: context.baseHeadSha,
    headRef: context.branchName,
    headSha
  });
  if (push) {
    git(['push', '--set-upstream', 'origin', context.branchName], context.root);
    context.remotePushed = true;
  }
  const pull = await githubCreatePr({ repository, token, context, task, binding, fetchImpl });
  if (pull?.draft !== false) throw new Error('task PR must be non-draft');
  if (pull?.head?.sha !== headSha) throw new Error('created task PR head does not match bound Git head');
  if (pull?.head?.ref !== context.branchName || pull?.base?.ref !== context.baseBranch) {
    throw new Error('created task PR branch binding mismatch');
  }
  if (pull?.base?.sha !== context.baseHeadSha) {
    throw new Error('created task PR base head does not match bound base head');
  }
  const durableBinding = parseTaskPrBindingBody(pull?.body);
  validateTaskPrAuthorityRecord(durableBinding, pull);
  validateTaskPrBinding(durableBinding, { task, promotion, expectedHeadSha: pull.head.sha });
  return Object.freeze({ binding: durableBinding, pullRequest: pull });
}

function rollbackTaskGitBranch(context) {
  if (!context?.root || !context.baseHeadSha || !context.baseBranch || !context.branchName) return;
  let remoteCleanupError = null;
  if (context.remotePushed) {
    const deletion = git(['push', 'origin', '--delete', context.branchName], context.root, { allowFailure: true });
    if (deletion.status !== 0) {
      const detail = deletion.stderr || deletion.stdout || 'unknown git error';
      remoteCleanupError = new Error(`task rollback remote cleanup failed: ${detail}`);
    }
  }
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], context.root, { allowFailure: true }).stdout;
  if (currentBranch === context.branchName) {
    git(['reset', '--hard', context.baseHeadSha], context.root);
    git(['clean', '-fd', '--', '.'], context.root);
    git(['switch', context.baseBranch], context.root);
  } else if (currentBranch && currentBranch !== context.baseBranch) {
    git(['switch', context.baseBranch], context.root, { allowFailure: true });
  }
  git(['branch', '-D', context.branchName], context.root, { allowFailure: true });
  if (remoteCleanupError) throw remoteCleanupError;
}

function loadApprovedTask(projectRoot, manifest, taskId) {
  const safeTaskId = String(taskId || '').trim();
  const taskFile = path.join(path.resolve(projectRoot), '.factory', 'tasks', `${safeTaskId}.json`);
  if (!fs.existsSync(taskFile)) throw new Error(`Owner-selected task missing: ${safeTaskId}`);
  const task = validateTaskContract(JSON.parse(fs.readFileSync(taskFile, 'utf8')), manifest);
  if (task.taskId !== safeTaskId) throw new Error('Owner-selected task file identity mismatch');
  loadOwnerTaskApproval(projectRoot, {
    projectId: task.projectId,
    taskId: task.taskId,
    taskContractSha256: task.contractSha256
  });
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
  const task = loadApprovedTask(projectRoot, manifest, taskId);
  const milestoneRef = `milestones/${task.milestoneId}.json`;
  const context = buildProjectContext({ projectRoot, manifest, task, milestoneRef });
  const contextEvidence = Object.freeze({
    schemaVersion: context.schemaVersion,
    selectionSha256: context.selectionSha256,
    selectedFileCount: context.selectedFileCount,
    selectedBytes: context.selectedBytes
  });
  const gitContext = prepareTaskGitBranch({ repoRoot, projectRoot, task, baseBranch });

  try {
    const engineerRequest = deepFreeze(structuredClone({ manifest, task, context }));
    const engineer = checkedEngineerResult(await requestEngineerPatch(engineerRequest));
    assertGitBaseUnchanged(gitContext, { requireClean: true });
    const transaction = prepareTaskTransaction({ projectRoot, task, operations: engineer.operations });
    const promotion = commitVerifiedTransaction(transaction, {
      modelEvidence: engineer.modelEvidence,
      operationEvidence: {
        operation: 'project-task',
        context: contextEvidence
      },
      verifiedAt
    });
    if (promotion.status !== 'committed' || promotion.baselinePromoted !== true) {
      rollbackTaskGitBranch(gitContext);
      return Object.freeze({ status: 'aborted', taskId: task.taskId, promotion });
    }
    const published = await publishVerifiedTask({
      context: gitContext,
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
      contextSelectionSha256: contextEvidence.selectionSha256,
      promotion,
      binding: published.binding,
      pullRequest: {
        number: published.pullRequest.number,
        htmlUrl: published.pullRequest.html_url,
        draft: published.pullRequest.draft,
        headSha: published.pullRequest.head.sha,
        headRef: published.pullRequest.head.ref,
        baseRef: published.pullRequest.base.ref,
        baseSha: published.pullRequest.base.sha
      }
    });
  } catch (error) {
    try {
      rollbackTaskGitBranch(gitContext);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        `PG-A0 task failed and rollback cleanup failed: ${error.message}; ${rollbackError.message}`
      );
    }
    throw error;
  }
}
