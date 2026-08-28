import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../config.mjs';

export const PROTECTED_PATH_PREFIXES = Object.freeze([
  '.github/',
  'factory/prompts/',
  'factory/src/control/',
  'factory/src/verify/',
  'skills/'
]);

export const COMMIT_ALLOWLISTS = Object.freeze({
  produce: Object.freeze([
    'runs/',
    'drafts/',
    'memory/',
    'learning/',
    'evaluation/results/'
  ]),
  review: Object.freeze([
    'runs/',
    'drafts/',
    'products/',
    'archive/',
    'memory/',
    'learning/',
    'evaluation/results/'
  ])
});

const SECRET_PATTERNS = Object.freeze([
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'openai-style-key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/ }
]);

function normalizeRepoPath(value) {
  return String(value || '').trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function matchesPrefix(file, prefix) {
  const normalized = normalizeRepoPath(file);
  return normalized === prefix.replace(/\/$/, '') || normalized.startsWith(prefix);
}

export function forbiddenProtectedChanges(paths) {
  return [...new Set((paths || []).map(normalizeRepoPath).filter(Boolean))]
    .filter((file) => PROTECTED_PATH_PREFIXES.some((prefix) => matchesPrefix(file, prefix)))
    .sort();
}

export function disallowedStagedPaths(paths, mode) {
  const allow = COMMIT_ALLOWLISTS[mode];
  if (!allow) throw new Error(`unknown commit policy mode: ${mode}`);
  return [...new Set((paths || []).map(normalizeRepoPath).filter(Boolean))]
    .filter((file) => !allow.some((prefix) => matchesPrefix(file, prefix)))
    .sort();
}

export function detectSecrets(text) {
  const value = String(text || '');
  return SECRET_PATTERNS.filter(({ re }) => re.test(value)).map(({ id }) => id);
}

function gitLines(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr || result.stdout || '').trim()}`);
  }
  return String(result.stdout || '').split(/\r?\n/).map(normalizeRepoPath).filter(Boolean);
}

function readStagedText(file) {
  const result = spawnSync('git', ['show', `:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) return null;
  if (result.stdout.includes('\u0000')) return null;
  return result.stdout;
}

export function assertRuntimeProtectedPathsClean() {
  const changed = gitLines(['diff', '--name-only', 'HEAD', '--', ...PROTECTED_PATH_PREFIXES]);
  const forbidden = forbiddenProtectedChanges(changed);
  if (forbidden.length) {
    throw new Error(`runtime modified protected paths: ${forbidden.join(', ')}`);
  }
  return { pass: true, changed: [] };
}

export function assertStagedCommitPolicy(mode) {
  const staged = gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMRD']);
  const disallowed = disallowedStagedPaths(staged, mode);
  if (disallowed.length) {
    throw new Error(`staged paths outside ${mode} allowlist: ${disallowed.join(', ')}`);
  }

  const secretFindings = [];
  for (const file of staged) {
    const absolute = path.resolve(ROOT, file);
    if (!absolute.startsWith(`${ROOT}${path.sep}`)) continue;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile() && fs.statSync(absolute).size > 8 * 1024 * 1024) continue;
    const text = readStagedText(file);
    if (text == null) continue;
    for (const kind of detectSecrets(text)) secretFindings.push({ file, kind });
  }
  if (secretFindings.length) {
    throw new Error(`potential secrets in staged evidence: ${secretFindings.map((x) => `${x.file}:${x.kind}`).join(', ')}`);
  }
  return { pass: true, staged };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const mode = argValue('--mode');
  if (!COMMIT_ALLOWLISTS[mode]) throw new Error('usage: staged-commit-policy.mjs --mode <produce|review> [--check-runtime] [--check-staged]');
  if (process.argv.includes('--check-runtime')) assertRuntimeProtectedPathsClean();
  if (process.argv.includes('--check-staged')) assertStagedCommitPolicy(mode);
  if (!process.argv.includes('--check-runtime') && !process.argv.includes('--check-staged')) {
    throw new Error('commit policy requires --check-runtime and/or --check-staged');
  }
  console.log(`workflow commit policy ${mode}: PASS`);
}
