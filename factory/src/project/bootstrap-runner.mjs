import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  PROJECT_BOOTSTRAP_TASK_ID,
  createProjectBootstrapEvidence,
  projectBootstrapGeneratedPaths,
  validateOwnerProjectBootstrapApproval,
  validateProjectBootstrapPayload,
  validateProjectBootstrapSpec
} from './bootstrap-contract.mjs';
import { assertSafeId, sha256 } from './contracts.mjs';
import { captureProjectTree } from './file-state.mjs';
import {
  assertGitCommitSha,
  createBootstrapPrBinding,
  parseTaskPrBindingBody,
  taskPrBindingBody,
  validateBootstrapPrBinding,
  validateTaskPrAuthorityRecord
} from './git-task-pr.mjs';
import { dispatchTrustedProjectPr } from './trusted-pr-dispatch.mjs';

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

function walkFiles(root, current = root, out = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (entry.isSymbolicLink()) throw new Error(`bootstrap source contains forbidden symlink: ${relative}`);
    if (entry.isDirectory()) walkFiles(root, absolute, out);
    else if (entry.isFile()) out.push(relative);
    else throw new Error(`bootstrap source contains unsupported entry: ${relative}`);
  }
  return out;
}

function readJson(file, field) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${field} unreadable: ${error.message}`);
  }
}

export function loadProjectBootstrapAuthority({ repoRoot, projectId } = {}) {
  const root = path.resolve(repoRoot);
  const safeProjectId = assertSafeId(projectId, 'bootstrap projectId');
  const authorityRoot = path.join(root, 'factory', 'project-bootstrap');
  const specFile = path.join(authorityRoot, 'specs', `${safeProjectId}.json`);
  const approvalFile = path.join(authorityRoot, 'approvals', `${safeProjectId}.json`);
  const templateRoot = path.join(authorityRoot, 'templates', safeProjectId);
  for (const [file, field] of [[specFile, 'bootstrap spec'], [approvalFile, 'bootstrap approval']]) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) {
      throw new Error(`${field} missing or invalid: ${file}`);
    }
  }
  if (!fs.existsSync(templateRoot) || !fs.statSync(templateRoot).isDirectory()
    || fs.lstatSync(templateRoot).isSymbolicLink()) {
    throw new Error(`bootstrap template missing or invalid: ${templateRoot}`);
  }
  const specText = fs.readFileSync(specFile, 'utf8');
  const approvalText = fs.readFileSync(approvalFile, 'utf8');
  const spec = validateProjectBootstrapSpec(readJson(specFile, 'bootstrap spec'));
  const approval = validateOwnerProjectBootstrapApproval(readJson(approvalFile, 'bootstrap approval'), spec);
  if (spec.projectId !== safeProjectId) throw new Error('bootstrap spec filename identity mismatch');
  const payload = validateProjectBootstrapPayload({
    spec,
    approval,
    readFile: (relative) => fs.readFileSync(path.join(templateRoot, relative)),
    listFiles: () => walkFiles(templateRoot)
  });
  return Object.freeze({
    root,
    authorityRoot,
    specFile,
    approvalFile,
    templateRoot,
    specText,
    approvalText,
    ...payload
  });
}

function prepareBootstrapBranch({ repoRoot, projectId, baseBranch }) {
  const root = path.resolve(repoRoot);
  const gitRoot = path.resolve(git(['rev-parse', '--show-toplevel'], root).stdout);
  if (gitRoot !== root) throw new Error('project bootstrap repoRoot must be the Git repository root');
  git(['check-ref-format', '--branch', baseBranch], root);
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root).stdout;
  if (currentBranch !== baseBranch) {
    throw new Error(`project bootstrap must start on ${baseBranch}, found ${currentBranch}`);
  }
  if (git(['status', '--porcelain', '--untracked-files=all'], root).stdout) {
    throw new Error('project bootstrap requires a clean repository');
  }
  const baseHeadSha = assertGitCommitSha(git(['rev-parse', 'HEAD'], root).stdout, 'bootstrap base Git head');
  const remoteBase = git(
    ['show-ref', '--verify', '--hash', `refs/remotes/origin/${baseBranch}`],
    root,
    { allowFailure: true }
  );
  if (remoteBase.status === 0
    && assertGitCommitSha(remoteBase.stdout, 'bootstrap origin base Git head') !== baseHeadSha) {
    throw new Error('project bootstrap local base head does not match origin base head');
  }
  const projectRoot = path.join(root, 'projects', projectId);
  if (fs.existsSync(projectRoot)) throw new Error(`project already exists: projects/${projectId}`);
  const branchName = `project-task/${projectId}/${PROJECT_BOOTSTRAP_TASK_ID}`;
  if (git(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], root, { allowFailure: true }).status === 0) {
    throw new Error(`project bootstrap branch already exists: ${branchName}`);
  }
  git(['switch', '-c', branchName], root);
  return { root, projectRoot, projectId, baseBranch, baseHeadSha, branchName, remotePushed: false };
}

function copyTemplateFile(templateRoot, projectRoot, relative) {
  const source = path.join(templateRoot, relative);
  const target = path.join(projectRoot, relative);
  const sourceReal = fs.realpathSync(source);
  const templateReal = fs.realpathSync(templateRoot);
  if (sourceReal !== templateReal && !sourceReal.startsWith(`${templateReal}${path.sep}`)) {
    throw new Error(`bootstrap template path escapes authority root: ${relative}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, fs.readFileSync(source), { mode: 0o600 });
}

function materializeBootstrap(context, authority) {
  fs.mkdirSync(path.dirname(context.projectRoot), { recursive: true });
  fs.mkdirSync(context.projectRoot, { recursive: false });
  for (const file of authority.spec.files) {
    copyTemplateFile(authority.templateRoot, context.projectRoot, file.path);
  }
  const generated = projectBootstrapGeneratedPaths();
  const generatedInputs = [
    [generated.spec, authority.specText],
    [generated.approval, authority.approvalText]
  ];
  for (const [relative, content] of generatedInputs) {
    const target = path.join(context.projectRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { mode: 0o600 });
  }
  const initialTree = captureProjectTree(context.projectRoot, { excludes: [] });
  const exactFiles = Object.entries(initialTree.files).map(([file, meta]) => ({
    path: file,
    sha256: meta.sha256
  }));
  const evidence = createProjectBootstrapEvidence({
    spec: authority.spec,
    approvalText: authority.approvalText,
    initialTreeSha256: initialTree.treeSha256,
    files: exactFiles
  });
  const evidenceText = `${JSON.stringify(evidence, null, 2)}\n`;
  const evidenceFile = path.join(context.projectRoot, generated.evidence);
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
  fs.writeFileSync(evidenceFile, evidenceText, { mode: 0o600 });
  const finalTree = captureProjectTree(context.projectRoot, { excludes: [] });
  validateMaterializedProjectBootstrap({ projectRoot: context.projectRoot, authority });
  return Object.freeze({
    evidence,
    evidenceSha256: sha256(Buffer.from(evidenceText)),
    initialTree,
    finalTree
  });
}

export function validateMaterializedProjectBootstrap({ projectRoot, authority } = {}) {
  const root = path.resolve(projectRoot);
  const generated = projectBootstrapGeneratedPaths();
  const specText = fs.readFileSync(path.join(root, generated.spec), 'utf8');
  const approvalText = fs.readFileSync(path.join(root, generated.approval), 'utf8');
  if (specText !== authority.specText || approvalText !== authority.approvalText) {
    throw new Error('materialized bootstrap authority copy mismatch');
  }
  validateProjectBootstrapPayload({
    spec: JSON.parse(specText),
    approval: JSON.parse(approvalText),
    readFile: (relative) => fs.readFileSync(path.join(root, relative)),
    listFiles: () => authority.spec.files.map((file) => file.path)
  });
  const evidenceText = fs.readFileSync(path.join(root, generated.evidence), 'utf8');
  const evidence = JSON.parse(evidenceText);
  if (evidence?.schemaVersion !== 'project-game.bootstrap-evidence/v1'
    || evidence.projectId !== authority.spec.projectId
    || evidence.taskId !== PROJECT_BOOTSTRAP_TASK_ID
    || evidence.bootstrapSpecSha256 !== authority.spec.contractSha256
    || evidence.ownerApprovalSha256 !== sha256(Buffer.from(authority.approvalText))
    || evidence.engineerCallExecuted !== false
    || evidence.result !== 'PASS') {
    throw new Error('materialized bootstrap evidence invalid');
  }
  for (const file of evidence.files || []) {
    const content = fs.readFileSync(path.join(root, file.path));
    if (sha256(content) !== file.sha256) {
      throw new Error(`materialized bootstrap evidence file mismatch: ${file.path}`);
    }
  }
  const initialTree = captureProjectTree(root, { excludes: [generated.evidence] });
  if (initialTree.treeSha256 !== evidence.initialTreeSha256
    || JSON.stringify(Object.keys(initialTree.files).sort())
      !== JSON.stringify((evidence.files || []).map((file) => file.path).sort())) {
    throw new Error('materialized bootstrap initial tree evidence mismatch');
  }
  return Object.freeze({ evidence, evidenceSha256: sha256(Buffer.from(evidenceText)) });
}

function stageBootstrap(context, materialized) {
  const projectPrefix = `projects/${context.projectId}/`;
  git(['add', '--all', '--', `projects/${context.projectId}`], context.root);
  const staged = git(['diff', '--cached', '--name-only'], context.root).stdout.split('\n').filter(Boolean);
  const expected = Object.keys(materialized.finalTree.files).map((file) => `${projectPrefix}${file}`).sort();
  if (JSON.stringify(staged.sort()) !== JSON.stringify(expected)) {
    throw new Error('project bootstrap staged file set does not match exact initial tree');
  }
}

async function githubFailureDetail(response) {
  if (typeof response?.json !== 'function') return '';
  try {
    const payload = await response.json();
    return typeof payload?.message === 'string'
      ? payload.message.replace(/\s+/g, ' ').trim().slice(0, 300)
      : '';
  } catch {
    return '';
  }
}

async function createBootstrapPullRequest({ repository, token, context, binding, fetchImpl }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(repository || ''))) {
    throw new Error('GITHUB_REPOSITORY owner/name is required');
  }
  if (!String(token || '').trim()) throw new Error('GITHUB_TOKEN is required to create bootstrap PR');
  if (typeof fetchImpl !== 'function') throw new Error('bootstrap PR fetch implementation missing');
  const response = await fetchImpl(`https://api.github.com/repos/${repository}/pulls`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      title: `[Project ${context.projectId}] ${PROJECT_BOOTSTRAP_TASK_ID}: establish initial workspace`,
      body: taskPrBindingBody(binding),
      head: context.branchName,
      base: context.baseBranch,
      draft: false
    })
  });
  if (!response.ok) {
    const detail = await githubFailureDetail(response);
    throw new Error(`GitHub bootstrap PR creation failed: HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
}

function rollbackBootstrap(context) {
  if (!context?.root) return;
  let remoteError = null;
  if (context.remotePushed) {
    const deleted = git(['push', 'origin', '--delete', context.branchName], context.root, { allowFailure: true });
    if (deleted.status !== 0) remoteError = new Error(`bootstrap remote cleanup failed: ${deleted.stderr}`);
  }
  const current = git(['rev-parse', '--abbrev-ref', 'HEAD'], context.root, { allowFailure: true }).stdout;
  if (current === context.branchName) {
    git(['reset', '--hard', context.baseHeadSha], context.root);
    git(['clean', '-fd', '--', `projects/${context.projectId}`], context.root);
    git(['switch', context.baseBranch], context.root);
  }
  git(['branch', '-D', context.branchName], context.root, { allowFailure: true });
  if (remoteError) throw remoteError;
}

export async function runProjectBootstrap({
  repoRoot,
  projectId,
  baseBranch = 'main',
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN,
  fetchImpl = globalThis.fetch,
  dispatchFetchImpl = fetchImpl,
  push = true
} = {}) {
  const authority = loadProjectBootstrapAuthority({ repoRoot, projectId });
  const context = prepareBootstrapBranch({ repoRoot, projectId: authority.spec.projectId, baseBranch });
  try {
    const materialized = materializeBootstrap(context, authority);
    stageBootstrap(context, materialized);
    git(
      ['commit', '-m', `project(${context.projectId}): establish governed bootstrap workspace`],
      context.root
    );
    const headSha = assertGitCommitSha(git(['rev-parse', 'HEAD'], context.root).stdout, 'bootstrap Git head');
    const binding = createBootstrapPrBinding({
      spec: authority.spec,
      baselineTreeSha256: materialized.finalTree.treeSha256,
      evidenceSha256: materialized.evidenceSha256,
      baseRef: context.baseBranch,
      baseHeadSha: context.baseHeadSha,
      headRef: context.branchName,
      headSha
    });
    if (push) {
      git(['push', '--set-upstream', 'origin', context.branchName], context.root);
      context.remotePushed = true;
    }
    const pull = await createBootstrapPullRequest({ repository, token, context, binding, fetchImpl });
    if (pull?.draft !== false || pull?.head?.sha !== headSha
      || pull?.head?.ref !== context.branchName
      || pull?.base?.ref !== context.baseBranch
      || pull?.base?.sha !== context.baseHeadSha) {
      throw new Error('created bootstrap PR live identity mismatch');
    }
    const durableBinding = parseTaskPrBindingBody(pull.body);
    validateTaskPrAuthorityRecord(durableBinding, pull);
    validateBootstrapPrBinding(durableBinding, {
      spec: authority.spec,
      baselineTreeSha256: materialized.finalTree.treeSha256,
      evidenceSha256: materialized.evidenceSha256,
      expectedHeadSha: pull.head.sha
    });
    const provenanceDispatch = await dispatchTrustedProjectPr({
      repository,
      token,
      pull,
      task: { projectId: authority.spec.projectId, taskId: authority.spec.bootstrapTaskId },
      trustedRef: context.baseBranch,
      fetchImpl: dispatchFetchImpl
    });
    return Object.freeze({
      status: 'pr-open',
      projectId: authority.spec.projectId,
      taskId: authority.spec.bootstrapTaskId,
      bootstrapSpecSha256: authority.spec.contractSha256,
      initialTreeSha256: materialized.initialTree.treeSha256,
      baselineTreeSha256: materialized.finalTree.treeSha256,
      evidenceSha256: materialized.evidenceSha256,
      binding: durableBinding,
      provenanceDispatch,
      pullRequest: {
        number: pull.number,
        htmlUrl: pull.html_url,
        draft: pull.draft,
        headSha: pull.head.sha,
        headRef: pull.head.ref,
        baseRef: pull.base.ref,
        baseSha: pull.base.sha
      }
    });
  } catch (error) {
    try {
      rollbackBootstrap(context);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        `Project bootstrap failed and rollback cleanup failed: ${error.message}; ${rollbackError.message}`
      );
    }
    throw error;
  }
}
