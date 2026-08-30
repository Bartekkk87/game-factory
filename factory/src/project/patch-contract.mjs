import fs from 'node:fs';
import path from 'node:path';
import {
  assertSha256,
  isReservedProjectPath,
  normalizeProjectPath,
  pathMatchesPrefix,
  sha256,
  validateTaskContract
} from './contracts.mjs';
import { captureProjectTree, diffProjectTrees } from './file-state.mjs';
import { assertAuthorizedMutationRoot } from './workspace-boundary.mjs';

const OPERATIONS = new Set(['ADD', 'MODIFY', 'DELETE']);

function absoluteTarget(root, relative) {
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error(`patch path escapes project: ${relative}`);
  return absolute;
}

function allowedFor(task, operation, file) {
  const key = operation === 'ADD' ? 'add' : operation === 'MODIFY' ? 'modify' : 'delete';
  return task.scope[key].includes(file);
}

function validateOperation(raw, index, task) {
  const operation = String(raw?.operation || '').toUpperCase();
  if (!OPERATIONS.has(operation)) throw new Error(`patch operation ${index} is invalid`);
  const file = normalizeProjectPath(raw?.path, `patch operation ${index}.path`);
  if (isReservedProjectPath(file)) throw new Error(`patch targets reserved project authority path: ${file}`);
  if (task.scope.protected.some((prefix) => pathMatchesPrefix(file, prefix))) {
    throw new Error(`patch targets protected path: ${file}`);
  }
  if (!allowedFor(task, operation, file)) throw new Error(`scope escape: ${operation} ${file}`);
  const content = operation === 'DELETE' ? null : String(raw?.content ?? '');
  const beforeSha256 = operation === 'ADD' ? null : assertSha256(raw?.beforeSha256, `${file}.beforeSha256`);
  const afterSha256 = operation === 'DELETE' ? null : assertSha256(raw?.afterSha256, `${file}.afterSha256`);
  if (content !== null && sha256(Buffer.from(content)) !== afterSha256) throw new Error(`after SHA mismatch in patch contract: ${file}`);
  return Object.freeze({ operation, path: file, beforeSha256, afterSha256, content });
}

export function validatePatchContract({ task, operations, manifest = null } = {}) {
  const checkedTask = validateTaskContract(task, manifest);
  if (!Array.isArray(operations) || !operations.length) throw new Error('patch operations are required');
  if (operations.length > checkedTask.scope.maxFilesChanged) throw new Error('patch exceeds maxFilesChanged');
  const normalized = operations.map((item, index) => validateOperation(item, index, checkedTask));
  if (new Set(normalized.map((item) => item.path)).size !== normalized.length) throw new Error('patch contains duplicate paths');
  return Object.freeze({
    schemaVersion: 'project-game.patch/v1',
    taskId: checkedTask.taskId,
    taskContractSha256: checkedTask.contractSha256,
    operations: normalized
  });
}

export function applyPatchToStaging({ projectRoot, task, operations, manifest = null, workspaceAuthority } = {}) {
  const root = path.resolve(projectRoot);
  assertAuthorizedMutationRoot(root, workspaceAuthority, { allowTransactionStaging: true });
  const patch = validatePatchContract({ task, operations, manifest });
  const treeOptions = manifest
    ? { excludes: [manifest.layout.buildDir, '.factory/evidence', '.factory/verification', '.factory/project-state.json', '.factory/transactions'] }
    : {};
  const before = captureProjectTree(root, treeOptions);

  for (const item of patch.operations) {
    const target = absoluteTarget(root, item.path);
    const exists = fs.existsSync(target);
    if (exists && fs.lstatSync(target).isSymbolicLink()) throw new Error(`patch target is a symlink: ${item.path}`);
    if (item.operation === 'ADD' && exists) throw new Error(`ADD target already exists: ${item.path}`);
    if (item.operation !== 'ADD' && !exists) throw new Error(`${item.operation} target does not exist: ${item.path}`);
    if (item.operation !== 'ADD') {
      const actualBeforeSha = sha256(fs.readFileSync(target));
      if (actualBeforeSha !== item.beforeSha256) throw new Error(`before SHA mismatch: ${item.path}`);
    }
    if (item.operation === 'DELETE') fs.rmSync(target);
    else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, item.content);
    }
  }

  const after = captureProjectTree(root, treeOptions);
  const changed = diffProjectTrees(before, after);
  const declared = patch.operations.map((item) => `${item.operation}:${item.path}`).sort();
  const observed = changed.map((item) => `${item.operation}:${item.path}`).sort();
  if (JSON.stringify(declared) !== JSON.stringify(observed)) {
    throw new Error(`scope evidence mismatch: declared=${declared.join(',')} observed=${observed.join(',')}`);
  }
  return Object.freeze({
    schemaVersion: 'project-game.patch-evidence/v1',
    taskId: patch.taskId,
    taskContractSha256: patch.taskContractSha256,
    baselineBefore: before.treeSha256,
    candidateAfter: after.treeSha256,
    filesChanged: changed
  });
}
