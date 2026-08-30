import fs from 'node:fs';
import path from 'node:path';
import { createProjectManifest, validateProjectManifest } from './contracts.mjs';
import { initializeProjectState } from './project-state.mjs';

const CONTROL_DIRS = Object.freeze([
  'decisions',
  'milestones',
  '.factory/tasks',
  '.factory/evidence',
  '.factory/verification'
]);

export function initializeProjectWorkspace(projectRoot, input = {}) {
  const root = path.resolve(projectRoot);
  if (fs.existsSync(root) && fs.readdirSync(root).length) throw new Error(`project workspace is not empty: ${root}`);
  const manifest = createProjectManifest(input);
  fs.mkdirSync(root, { recursive: true });
  const layoutDirs = Object.values(manifest.layout);
  for (const dir of [...CONTROL_DIRS, ...layoutDirs]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, 'PROJECT.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'ROADMAP.json'), `${JSON.stringify({ schemaVersion: 'project-game.roadmap/v1', projectId: manifest.projectId, milestones: [] }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'ARCHITECTURE.md'), `# ${manifest.projectId} Architecture\n\nProject-local architecture decisions belong in \`decisions/\`.\n`);
  initializeProjectState(root, manifest.projectId);
  return manifest;
}

export function loadProjectManifest(projectRoot) {
  const file = path.join(path.resolve(projectRoot), 'PROJECT.json');
  if (!fs.existsSync(file)) throw new Error(`project manifest missing: ${file}`);
  return validateProjectManifest(JSON.parse(fs.readFileSync(file, 'utf8')));
}

export function projectWorkspaceLayout() {
  return {
    editableSource: 'projects/<project-id>/src',
    buildOutput: 'projects/<project-id>/build',
    authority: 'verified source reaches protected main only through a task branch and PR',
    runtimeState: 'not authoritative for project source'
  };
}
