import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.mjs';
import { writeJson } from '../util/fsx.mjs';

export const BINARY_EVIDENCE_SCHEMA = 'game-factory.binary-evidence-manifest/v1';
export const DEFAULT_RETENTION_DAYS = 30;
export const BINARY_EXTENSIONS = Object.freeze(new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.mov', '.wav', '.mp3', '.zip'
]));

function repoPath(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function isInsideRoot(file) {
  const resolved = path.resolve(file);
  return resolved === ROOT || resolved.startsWith(`${ROOT}${path.sep}`);
}

export function isBinaryEvidencePath(file) {
  const normalized = String(file || '').replaceAll('\\', '/').toLowerCase();
  return BINARY_EXTENSIONS.has(path.extname(normalized));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.isFile() && isBinaryEvidencePath(file)) out.push(file);
  }
  return out;
}

function fileSha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function buildBinaryEvidenceManifest({
  roots = ['runs', 'drafts', 'products', 'archive'],
  artifactName,
  workflowRunId,
  retentionDays = DEFAULT_RETENTION_DAYS
} = {}) {
  if (!String(artifactName || '').trim()) throw new Error('binary evidence artifactName is required');
  if (!String(workflowRunId || '').trim()) throw new Error('binary evidence workflowRunId is required');
  if (!Number.isInteger(Number(retentionDays)) || Number(retentionDays) < 1 || Number(retentionDays) > 90) {
    throw new Error('binary evidence retentionDays must be integer 1..90');
  }
  const files = [...new Set(roots.flatMap((root) => {
    const absolute = path.resolve(ROOT, root);
    if (!isInsideRoot(absolute)) throw new Error(`binary evidence root escapes repository: ${root}`);
    return walk(absolute);
  }))].sort();
  return {
    schemaVersion: BINARY_EVIDENCE_SCHEMA,
    generatedAt: new Date().toISOString(),
    storage: {
      provider: 'github-actions-artifact',
      artifactName: String(artifactName),
      workflowRunId: String(workflowRunId),
      retentionDays: Number(retentionDays),
      durabilityClass: 'bounded-retention-object-storage'
    },
    files: files.map((file) => ({
      path: repoPath(file),
      sha256: fileSha256(file),
      bytes: fs.statSync(file).size
    }))
  };
}

export function writeBinaryEvidenceManifest({ out, ...options }) {
  const output = path.resolve(ROOT, out || 'evaluation/results/BINARY-EVIDENCE.json');
  if (!isInsideRoot(output)) throw new Error('binary evidence manifest output escapes repository');
  const manifest = buildBinaryEvidenceManifest(options);
  writeJson(output, manifest);
  return manifest;
}

export function purgeBinaryEvidence({ roots = ['runs', 'drafts', 'products', 'archive'] } = {}) {
  const removed = [];
  for (const root of roots) {
    const absolute = path.resolve(ROOT, root);
    if (!isInsideRoot(absolute)) throw new Error(`binary evidence root escapes repository: ${root}`);
    for (const file of walk(absolute)) {
      removed.push(repoPath(file));
      fs.rmSync(file, { force: true });
    }
  }
  return removed.sort();
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const mode = arg('--mode');
  const roots = String(arg('--roots') || 'runs,drafts,products,archive').split(',').map((x) => x.trim()).filter(Boolean);
  if (mode === 'prepare') {
    const manifest = writeBinaryEvidenceManifest({
      out: arg('--out') || 'evaluation/results/BINARY-EVIDENCE.json',
      roots,
      artifactName: arg('--artifact-name'),
      workflowRunId: arg('--workflow-run-id'),
      retentionDays: Number(arg('--retention-days') || DEFAULT_RETENTION_DAYS)
    });
    console.log(`binary evidence manifest: ${manifest.files.length} files`);
  } else if (mode === 'purge') {
    console.log(`binary evidence purged: ${purgeBinaryEvidence({ roots }).length} files`);
  } else {
    throw new Error('usage: binary-evidence.mjs --mode <prepare|purge> [--roots a,b] [--out path --artifact-name name --workflow-run-id id --retention-days N]');
  }
}
