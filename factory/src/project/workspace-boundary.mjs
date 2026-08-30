import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSafeId } from './contracts.mjs';

const WORKSPACE_AUTHORITY = Symbol('project-game-workspace-authority');

function realDirectory(candidate, field) {
  const resolved = path.resolve(candidate);
  if (!fs.existsSync(resolved)) throw new Error(`${field} missing: ${resolved}`);
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink()) throw new Error(`${field} must not be a symlink`);
  if (!stat.isDirectory()) throw new Error(`${field} must be a directory`);
  return fs.realpathSync(resolved);
}

function gitRepoRoot(projectRoot) {
  const result = spawnSync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('project root must be inside a Git repository');
  const text = String(result.stdout || '').trim();
  if (!text) throw new Error('Git repository root is missing');
  return fs.realpathSync(path.resolve(text));
}

export function authorizeProjectWorkspace({ projectRoot, projectId } = {}) {
  const checkedProjectId = assertSafeId(projectId, 'workspace projectId');
  const supplied = realDirectory(projectRoot, 'project root');
  const realRepoRoot = realDirectory(gitRepoRoot(supplied), 'repo root');
  const expectedPath = path.join(realRepoRoot, 'projects', checkedProjectId);
  const expected = realDirectory(expectedPath, 'expected project root');
  if (supplied !== expected) {
    throw new Error(`project root must be exactly repoRoot/projects/${checkedProjectId}`);
  }
  return Object.freeze({
    [WORKSPACE_AUTHORITY]: true,
    repoRoot: realRepoRoot,
    projectRoot: expected,
    projectId: checkedProjectId
  });
}

export function assertAuthorizedMutationRoot(projectRoot, authority, { allowTransactionStaging = false } = {}) {
  if (!authority?.[WORKSPACE_AUTHORITY]) throw new Error('project workspace authority missing');
  const candidate = realDirectory(projectRoot, 'mutation root');
  if (candidate === authority.projectRoot) return candidate;
  if (!allowTransactionStaging) throw new Error('mutation root is outside authorized project root');

  const txRoot = path.join(
    path.dirname(authority.projectRoot),
    `.${path.basename(authority.projectRoot)}.transactions`
  );
  const relative = path.relative(txRoot, candidate);
  const parts = relative.split(path.sep);
  if (parts.length !== 1 || relative.startsWith('..') || path.isAbsolute(relative)
    || !/^[A-Za-z0-9._-]+\.staging$/.test(parts[0])) {
    throw new Error('mutation staging root is outside authorized project transaction area');
  }
  return candidate;
}
