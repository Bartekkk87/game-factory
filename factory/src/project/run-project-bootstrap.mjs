import path from 'node:path';
import { runProjectBootstrap } from './bootstrap-runner.mjs';

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for Project Bootstrap`);
  return value;
}

const projectId = requiredEnv('GF_PROJECT_BOOTSTRAP_ID');
const result = await runProjectBootstrap({
  repoRoot: path.resolve(process.cwd()),
  projectId,
  baseBranch: 'main',
  repository: requiredEnv('GITHUB_REPOSITORY'),
  token: requiredEnv('GITHUB_TOKEN'),
  push: true
});

console.log(`PROJECT_BOOTSTRAP_RESULT=${JSON.stringify(result)}`);
