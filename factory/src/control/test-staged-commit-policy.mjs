import assert from 'node:assert/strict';
import {
  COMMIT_ALLOWLISTS,
  PROTECTED_PATH_PREFIXES,
  detectSecrets,
  disallowedStagedPaths,
  forbiddenProtectedChanges
} from './staged-commit-policy.mjs';

assert.equal(Array.isArray(COMMIT_ALLOWLISTS.produce), true);
assert.equal(Array.isArray(COMMIT_ALLOWLISTS.review), true);
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

console.log('workflow staged-commit policy selftest: PASS');
