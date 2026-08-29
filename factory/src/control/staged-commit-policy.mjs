import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../config.mjs';
import { isBinaryEvidencePath } from './binary-evidence.mjs';

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

export const RUNTIME_STATE_ALLOWLIST = COMMIT_ALLOWLISTS.review;

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

function outsideAllowlist(paths, allowlist) {
  return [...new Set((paths || []).map(normalizeRepoPath).filter(Boolean))]
    .filter((file) => !allowlist.some((prefix) => matchesPrefix(file, prefix)))
    .sort();
}

export function forbiddenProtectedChanges(paths) {
  return [...new Set((paths || []).map(normalizeRepoPath).filter(Boolean))]
    .filter((file) => PROTECTED_PATH_PREFIXES.some((prefix) => matchesPrefix(file, prefix)))
    .sort();
}

export function disallowedStagedPaths(paths, mode) {
  const allow = COMMIT_ALLOWLISTS[mode];
  if (!allow) throw new Error(`unknown commit policy mode: ${mode}`);
  return outsideAllowlist(paths, allow);
}

export function disallowedRuntimeStatePaths(paths) {
  return outsideAllowlist(paths, RUNTIME_STATE_ALLOWLIST);
}

export function forbiddenBinaryStatePaths(paths) {
  return [...new Set((paths || []).map(normalizeRepoPath).filter(Boolean))]
    .filter(isBinaryEvidencePath)
    .sort();
}

export function detectSecrets(text) {
  const value = String(text || '');
  return SECRET_PATTERNS.filter(({ re }) => re.test(value)).map(({ id }) => id);
}

function gitResult(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr || result.stdout || '').trim()}`);
  }
  return result;
}

function gitLines(args) {
  return String(gitResult(args).stdout || '').split(/\r?\n/).map(normalizeRepoPath).filter(Boolean);
}

function gitValue(args) {
  return String(gitResult(args).stdout || '').trim();
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
  if (forbidden.length) throw new Error(`runtime modified protected paths: ${forbidden.join(', ')}`);
  return { pass: true, changed: [] };
}

export function assertStagedCommitPolicy(mode) {
  const staged = gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMRD']);
  const disallowed = disallowedStagedPaths(staged, mode);
  if (disallowed.length) throw new Error(`staged paths outside ${mode} allowlist: ${disallowed.join(', ')}`);

  // Binary evidence may never be added, copied, modified or renamed into durable
  // runtime-state. Deletions are intentionally allowed so legacy tracked binary
  // evidence can be purged and the state branch can converge to the policy.
  const stagedBinaryWrites = gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  const binary = forbiddenBinaryStatePaths(stagedBinaryWrites);
  if (binary.length) {
    throw new Error(`binary evidence must use GitHub Actions artifact storage, not runtime-state: ${binary.join(', ')}`);
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

export function assertRuntimeStateHistoryPolicy(baseRef, stateRef) {
  if (!baseRef || !stateRef) throw new Error('runtime-state history policy requires baseRef and stateRef');
  const mergeBase = gitValue(['merge-base', baseRef, stateRef]);
  const uniqueStateChanges = gitLines(['diff', '--name-only', mergeBase, stateRef, '--']);
  const disallowed = disallowedRuntimeStatePaths(uniqueStateChanges);
  if (disallowed.length) throw new Error(`runtime-state contains non-state changes since merge-base: ${disallowed.join(', ')}`);
  return { pass: true, mergeBase, uniqueStateChanges };
}

export function assertRuntimeStateTreePolicy(baseRef, stateRef) {
  if (!baseRef || !stateRef) throw new Error('runtime-state tree policy requires baseRef and stateRef');
  const treeChanges = gitLines(['diff', '--name-only', baseRef, stateRef, '--']);
  const disallowed = disallowedRuntimeStatePaths(treeChanges);
  if (disallowed.length) throw new Error(`runtime-state tree differs from authoritative code outside state paths: ${disallowed.join(', ')}`);
  return { pass: true, treeChanges };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const mode = argValue('--mode');
  if (!COMMIT_ALLOWLISTS[mode]) {
    throw new Error('usage: staged-commit-policy.mjs --mode <produce|review> [--check-runtime] [--check-staged] [--check-state-history|--check-state-tree --base-ref <ref> --state-ref <ref>]');
  }
  let checked = false;
  if (process.argv.includes('--check-runtime')) {
    assertRuntimeProtectedPathsClean();
    checked = true;
  }
  if (process.argv.includes('--check-staged')) {
    assertStagedCommitPolicy(mode);
    checked = true;
  }
  if (process.argv.includes('--check-state-history')) {
    assertRuntimeStateHistoryPolicy(argValue('--base-ref'), argValue('--state-ref'));
    checked = true;
  }
  if (process.argv.includes('--check-state-tree')) {
    assertRuntimeStateTreePolicy(argValue('--base-ref'), argValue('--state-ref'));
    checked = true;
  }
  if (!checked) throw new Error('commit policy requires at least one check');
  console.log(`workflow commit policy ${mode}: PASS`);
}
