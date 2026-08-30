import fs from 'node:fs';
import path from 'node:path';
import { normalizeProjectPath, sha256, validateProjectManifest, validateTaskContract } from './contracts.mjs';

function collectDependencyClosure(manifest, seeds) {
  const graph = manifest.moduleGraph || {};
  const queue = [...seeds];
  const selected = new Set();
  while (queue.length) {
    const current = normalizeProjectPath(queue.shift(), 'context dependency');
    if (selected.has(current)) continue;
    selected.add(current);
    for (const dependency of graph[current] || []) queue.push(dependency);
  }
  return [...selected];
}

function taggedFiles(projectRoot, dir, tags) {
  if (!tags.length) return [];
  const absoluteDir = path.join(projectRoot, dir);
  if (!fs.existsSync(absoluteDir)) return [];
  return fs.readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dir, entry.name).split(path.sep).join('/'))
    .filter((relative) => {
      const record = JSON.parse(fs.readFileSync(path.join(projectRoot, relative), 'utf8'));
      return (record.tags || []).some((tag) => tags.includes(String(tag)));
    });
}

export function buildProjectContext({ projectRoot, manifest, task, milestoneRef } = {}) {
  const root = path.resolve(projectRoot);
  const checkedManifest = validateProjectManifest(manifest);
  const checkedTask = validateTaskContract(task, checkedManifest);
  const globalFiles = ['PROJECT.json', 'ARCHITECTURE.md'];
  const taskFiles = [
    normalizeProjectPath(milestoneRef, 'milestoneRef'),
    `.factory/tasks/${checkedTask.taskId}.json`
  ];
  const codeFiles = collectDependencyClosure(checkedManifest, [
    ...checkedTask.context.targetFiles,
    ...checkedTask.context.dependencyRoots
  ]);
  const mappedTests = codeFiles.flatMap((file) => checkedManifest.testMap?.[file] || []);
  const testFiles = [...new Set([...checkedTask.context.testFiles, ...mappedTests])];
  const memoryFiles = [
    ...taggedFiles(root, 'decisions', checkedTask.context.decisionTags),
    ...taggedFiles(root, '.factory/lessons', checkedTask.context.lessonTags)
  ];
  const ranked = [
    ...globalFiles.map((file) => ({ file, reason: 'global-authority', required: true })),
    ...taskFiles.map((file) => ({ file, reason: 'task-authority', required: true })),
    ...codeFiles.map((file) => ({ file, reason: 'target-or-dependency' })),
    ...testFiles.map((file) => ({ file, reason: 'mapped-test' })),
    ...memoryFiles.map((file) => ({ file, reason: 'tagged-project-memory' }))
  ];
  const seen = new Set();
  const included = [];
  const excluded = [];
  let bytes = 0;
  for (const candidate of ranked) {
    const file = normalizeProjectPath(candidate.file, 'context file');
    if (seen.has(file)) continue;
    seen.add(file);
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      if (candidate.required) throw new Error(`required context authority file missing: ${file}`);
      excluded.push({ path: file, reason: 'missing' });
      continue;
    }
    const content = fs.readFileSync(absolute, 'utf8');
    const fileBytes = Buffer.byteLength(content);
    if (included.length >= checkedTask.context.maxFiles || bytes + fileBytes > checkedTask.context.maxBytes) {
      if (candidate.required) throw new Error(`context bounds exclude required authority file: ${file}`);
      excluded.push({ path: file, reason: 'bound-exceeded', bytes: fileBytes });
      continue;
    }
    included.push({ path: file, reason: candidate.reason, sha256: sha256(Buffer.from(content)), bytes: fileBytes, content });
    bytes += fileBytes;
  }
  return Object.freeze({
    schemaVersion: 'project-game.context-selection/v1',
    projectId: checkedManifest.projectId,
    taskId: checkedTask.taskId,
    manifestSha256: checkedManifest.contractSha256,
    taskContractSha256: checkedTask.contractSha256,
    bounds: { maxFiles: checkedTask.context.maxFiles, maxBytes: checkedTask.context.maxBytes },
    selectedFileCount: included.length,
    selectedBytes: bytes,
    included,
    excluded,
    selectionSha256: sha256(JSON.stringify(included.map(({ path: file, reason, sha256: fileSha }) => ({ path: file, reason, sha256: fileSha }))))
  });
}
