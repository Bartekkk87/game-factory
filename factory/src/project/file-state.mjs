import fs from 'node:fs';
import path from 'node:path';
import { normalizeProjectPath, sha256 } from './contracts.mjs';

const DEFAULT_EXCLUDES = Object.freeze([
  'build',
  '.factory/evidence',
  '.factory/verification',
  '.factory/project-state.json',
  '.factory/transactions'
]);

function isExcluded(relative, excludes) {
  return excludes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`));
}

function walk(root, dir, out, excludes) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (isExcluded(relative, excludes)) continue;
    if (entry.isSymbolicLink()) throw new Error(`project workspace contains forbidden symlink: ${relative}`);
    if (entry.isDirectory()) walk(root, absolute, out, excludes);
    else if (entry.isFile()) {
      const content = fs.readFileSync(absolute);
      out[relative] = { sha256: sha256(content), bytes: content.length };
    }
  }
}

export function captureProjectTree(projectRoot, { excludes = DEFAULT_EXCLUDES } = {}) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`project root missing: ${root}`);
  const normalizedExcludes = excludes.map((value) => normalizeProjectPath(value, 'tree exclude'));
  const files = {};
  walk(root, root, files, normalizedExcludes);
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  const treeSha256 = sha256(entries.map(([file, meta]) => `${file}\0${meta.sha256}\0${meta.bytes}\n`).join(''));
  return Object.freeze({ schemaVersion: 'project-game.file-tree/v1', treeSha256, files });
}

export function diffProjectTrees(before, after) {
  const paths = [...new Set([...Object.keys(before?.files || {}), ...Object.keys(after?.files || {})])].sort();
  return paths.flatMap((file) => {
    const left = before?.files?.[file] || null;
    const right = after?.files?.[file] || null;
    if (left?.sha256 === right?.sha256) return [];
    return [{
      path: file,
      operation: left && right ? 'MODIFY' : left ? 'DELETE' : 'ADD',
      beforeSha256: left?.sha256 || null,
      afterSha256: right?.sha256 || null,
      beforeBytes: left?.bytes ?? null,
      afterBytes: right?.bytes ?? null
    }];
  });
}

export const PROJECT_TREE_DEFAULT_EXCLUDES = DEFAULT_EXCLUDES;
