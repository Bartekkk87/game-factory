import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { assertSafeId, assertSha256, validateTaskContract } from './contracts.mjs';

const PR_BINDING_SCHEMA = 'project-game.task-pr-binding/v1';

function git(args, cwd, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr || result.stdout || '').trim()}`);
  }
  return { status: result.status, stdout: String(result.stdout || '').trim() };
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

function checkedPromotion(task, promotion) {
  if (promotion?.status !== 'committed' || promotion?.baselinePromoted !== true) {
    throw new Error('task PR requires a committed verified baseline');
  }
  const baseline = promotion?.state?.baseline;
  if (baseline?.taskId !== task.taskId) throw new Error('promoted baseline task mismatch');
  return Object.freeze({
    treeSha256: assertSha256(baseline.treeSha256, 'promoted baseline treeSha256'),
    evidenceSha256: assertSha256(promotion.evidenceSha256, 'promoted evidenceSha256')
  });
}

export function prepareTaskGitBranch({ repoRoot, projectRoot, task, baseBranch = 'main' } = {}) {
  const checkedTask = validateTaskContract(task);
  const root = path.resolve(repoRoot);
  const projectPath = projectRepoPath(root, projectRoot, checkedTask.projectId);
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root).stdout;
  if (currentBranch !== baseBranch) throw new Error(`PG-A0 must start on ${baseBranch}, found ${currentBranch}`);
  if (git(['status', '--porcelain', '--untracked-files=all'], root).stdout) {
    throw new Error('PG-A0 requires a clean repository before task execution');
  }
  const baseHeadSha = git(['rev-parse', 'HEAD'], root).stdout;
  const branchName = `project-task/${checkedTask.projectId}/${checkedTask.taskId}`;
  const existing = git(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], root, { allowFailure: true });
  if (existing.status === 0) throw new Error(`task branch already exists: ${branchName}`);
  git(['switch', '-c', branchName], root);
  return Object.freeze({ root, projectPath, baseBranch, baseHeadSha, branchName });
}

function bindingBody(binding) {
  return [
    '## Project Game Mode PG-A0 binding',
    '',
    `- Schema: \`${binding.schemaVersion}\``,
    `- Task: \`${binding.taskId}\``,
    `- Task contract SHA-256: \`${binding.taskContractSha256}\``,
    `- Promoted baseline tree SHA-256: \`${binding.baselineTreeSha256}\``,
    `- Verification evidence SHA-256: \`${binding.evidenceSha256}\``,
    `- Git head: \`${binding.headSha}\``,
    `- Base head: \`${binding.baseHeadSha}\``,
    '',
    'This PR is the external Git authority binding for the verified promoted baseline. '
      + 'Changing the PR head invalidates this recorded binding and requires a new PG-A0 execution.'
  ].join('\n');
}

export function validateTaskPrBinding(binding, { task, promotion, expectedHeadSha = null } = {}) {
  const checkedTask = validateTaskContract(task);
  const baseline = checkedPromotion(checkedTask, promotion);
  if (binding?.schemaVersion !== PR_BINDING_SCHEMA) throw new Error('task PR binding schema invalid');
  if (binding.taskId !== checkedTask.taskId) throw new Error('task PR binding task mismatch');
  if (binding.taskContractSha256 !== checkedTask.contractSha256) throw new Error('task PR binding contract mismatch');
  if (binding.baselineTreeSha256 !== baseline.treeSha256) throw new Error('task PR binding baseline mismatch');
  if (binding.evidenceSha256 !== baseline.evidenceSha256) throw new Error('task PR binding evidence mismatch');
  assertSha256(binding.headSha, 'task PR binding headSha');
  if (expectedHeadSha && binding.headSha !== expectedHeadSha) throw new Error('task PR head moved after binding');
  return binding;
}

async function githubCreatePr({ repository, token, baseBranch, branchName, title, body, fetchImpl }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repository || ''))) {
    throw new Error('GITHUB_REPOSITORY owner/name is required');
  }
  if (!String(token || '').trim()) throw new Error('GITHUB_TOKEN is required to create task PR');
  const response = await fetchImpl(`https://api.github.com/repos/${repository}/pulls`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ title, body, head: branchName, base: baseBranch, draft: false })
  });
  if (!response.ok) throw new Error(`GitHub task PR creation failed: HTTP ${response.status}`);
  return response.json();
}

export async function publishTaskPullRequest({
  gitContext,
  task,
  promotion,
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN,
  fetchImpl = globalThis.fetch,
  push = true
} = {}) {
  const checkedTask = validateTaskContract(task);
  const baseline = checkedPromotion(checkedTask, promotion);
  const context = gitContext || {};
  if (!context.root || !context.projectPath || !context.branchName || !context.baseHeadSha) {
    throw new Error('task git context invalid');
  }
  git(['add', '--', context.projectPath], context.root);
  const staged = git(['diff', '--cached', '--name-only'], context.root).stdout.split('\n').filter(Boolean);
  if (!staged.length) throw new Error('verified baseline produced no Git changes');
  if (staged.some((file) => file !== context.projectPath && !file.startsWith(`${context.projectPath}/`))) {
    throw new Error('task commit contains paths outside project workspace');
  }
  git(['commit', '-m', `project(${checkedTask.projectId}): ${checkedTask.taskId} ${checkedTask.title}`], context.root);
  const headSha = git(['rev-parse', 'HEAD'], context.root).stdout;
  const binding = Object.freeze({
    schemaVersion: PR_BINDING_SCHEMA,
    taskId: checkedTask.taskId,
    taskContractSha256: checkedTask.contractSha256,
    baselineTreeSha256: baseline.treeSha256,
    evidenceSha256: baseline.evidenceSha256,
    baseHeadSha: context.baseHeadSha,
    headSha
  });
  validateTaskPrBinding(binding, { task: checkedTask, promotion, expectedHeadSha: headSha });
  if (push) git(['push', '--set-upstream', 'origin', context.branchName], context.root);
  if (typeof fetchImpl !== 'function') throw new Error('task PR fetch implementation missing');
  const pull = await githubCreatePr({
    repository,
    token,
    baseBranch: context.baseBranch,
    branchName: context.branchName,
    title: `[Project ${checkedTask.projectId}] ${checkedTask.taskId}: ${checkedTask.title}`,
    body: bindingBody(binding),
    fetchImpl
  });
  if (pull?.draft !== false) throw new Error('task PR must be non-draft');
  if (pull?.head?.sha !== headSha) throw new Error('created task PR head does not match bound Git head');
  if (pull?.head?.ref !== context.branchName || pull?.base?.ref !== context.baseBranch) {
    throw new Error('created task PR branch binding mismatch');
  }
  return Object.freeze({ binding, pullRequest: pull });
}

export function rollbackTaskGitBranch(gitContext) {
  const context = gitContext || {};
  if (!context.root || !context.baseHeadSha || !context.baseBranch || !context.branchName) return;
  git(['reset', '--hard', context.baseHeadSha], context.root);
  git(['switch', context.baseBranch], context.root);
  git(['branch', '-D', context.branchName], context.root, { allowFailure: true });
}

export const TASK_PR_BINDING_SCHEMA = PR_BINDING_SCHEMA;
