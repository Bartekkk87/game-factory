import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMMIT_ALLOWLISTS,
  PROTECTED_PATH_PREFIXES,
  RUNTIME_STATE_ALLOWLIST,
  detectSecrets,
  disallowedRuntimeStatePaths,
  disallowedStagedPaths,
  forbiddenProtectedChanges
} from './staged-commit-policy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const workflow = (name) => fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8');

assert.equal(Array.isArray(COMMIT_ALLOWLISTS.produce), true);
assert.equal(Array.isArray(COMMIT_ALLOWLISTS.review), true);
assert.equal(RUNTIME_STATE_ALLOWLIST, COMMIT_ALLOWLISTS.review);
assert.equal(PROTECTED_PATH_PREFIXES.includes('factory/prompts/'), true);
assert.equal(PROTECTED_PATH_PREFIXES.includes('skills/'), true);
assert.equal(PROTECTED_PATH_PREFIXES.includes('factory/src/control/'), true);
assert.equal(PROTECTED_PATH_PREFIXES.includes('factory/src/verify/'), true);
assert.equal(PROTECTED_PATH_PREFIXES.includes('.github/'), true);

assert.deepEqual(disallowedStagedPaths([
  'runs/20260828/RUN-EVIDENCE.json',
  'drafts/example/index.html',
  'learning/candidates/candidate.json',
  'factory/prompts/director.md'
], 'produce'), ['factory/prompts/director.md']);

assert.deepEqual(disallowedStagedPaths([
  'products/example/index.html',
  'archive/example/meta.json',
  'memory/memory.json'
], 'review'), []);

assert.deepEqual(disallowedRuntimeStatePaths([
  'runs/20260828/RUN-EVIDENCE.json',
  'products/example/index.html',
  'archive/example/meta.json',
  'memory/memory.json',
  'learning/evidence/owner-feedback/x.json',
  'evaluation/results/S2-latest.json'
]), []);

assert.deepEqual(disallowedRuntimeStatePaths([
  'runs/ok.json',
  'ideas/unauthorized.md',
  'factory/src/pipeline/run.mjs',
  '.github/workflows/produce.yml'
]), [
  '.github/workflows/produce.yml',
  'factory/src/pipeline/run.mjs',
  'ideas/unauthorized.md'
]);

assert.deepEqual(forbiddenProtectedChanges([
  'runs/ok.json',
  'skills/directing.md',
  '.github/workflows/produce.yml',
  'factory/src/verify/contract.mjs'
]), [
  '.github/workflows/produce.yml',
  'factory/src/verify/contract.mjs',
  'skills/directing.md'
]);

assert.deepEqual(detectSecrets('safe evidence text'), []);
assert.deepEqual(detectSecrets('-----BEGIN PRIVATE KEY-----\nabc'), ['private-key']);
assert.deepEqual(detectSecrets('token ghp_abcdefghijklmnopqrstuvwxyz123456'), ['github-token']);
assert.deepEqual(detectSecrets('aws AKIAABCDEFGHIJKLMNOP'), ['aws-access-key']);
assert.deepEqual(detectSecrets('key sk-abcdefghijklmnopqrstuvwxyz123456'), ['openai-style-key']);

assert.throws(() => disallowedStagedPaths(['runs/a.json'], 'unknown'), /unknown commit policy mode/);

for (const name of ['produce.yml', 'review.yml']) {
  const text = workflow(name);
  assert.match(text, /group: game-factory-runtime-state/, `${name}: shared runtime-state concurrency group`);
  assert.match(text, /ref: main/, `${name}: authoritative code checkout must be main`);
  assert.match(text, /--check-state-history/, `${name}: runtime-state history must be checked`);
  assert.match(text, /--check-state-tree/, `${name}: runtime-state tree must be checked`);
  const pushes = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('git push'));
  assert.deepEqual(pushes, ['git push origin HEAD:runtime-state'], `${name}: runtime bot may only push runtime-state`);
}

const pages = workflow('pages.yml');
assert.match(pages, /branches: \[main, runtime-state\]/, 'pages must react to authoritative code and runtime-state changes');
assert.match(pages, /ref: main/, 'pages must execute authoritative code from main');
assert.match(pages, /--check-state-history/, 'pages must reject non-state runtime branch history');
assert.match(pages, /--check-state-tree/, 'pages must reject non-state runtime tree drift');

console.log('workflow staged-commit policy selftest: PASS');
