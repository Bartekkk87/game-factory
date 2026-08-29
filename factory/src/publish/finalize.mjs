import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PATHS } from '../config.mjs';
import { readJson, writeJson, sha256 } from '../util/fsx.mjs';
import { registerProduct, bumpStats } from '../memory/store.mjs';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

function stampShort() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function moveDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try { fs.renameSync(src, dest); }
  catch { fs.cpSync(src, dest, { recursive: true }); fs.rmSync(src, { recursive: true, force: true }); }
}

function assertSandboxedCandidate(draftDir, meta) {
  const candidateFile = path.join(draftDir, 'index.html');
  if (!fs.existsSync(candidateFile)) throw new Error(`missing candidate: ${path.relative(ROOT, candidateFile)}`);
  const host = fs.readFileSync(candidateFile, 'utf8');
  const actualHostSha = sha256(Buffer.from(host));
  if (!meta.previewHostSha256 || actualHostSha !== meta.previewHostSha256) {
    throw new Error(`preview host SHA mismatch for ${meta.slug || path.basename(draftDir)}`);
  }
  if (!/^[0-9a-f]{64}$/.test(String(meta.candidateSha || ''))) throw new Error('verified candidate SHA is missing');
  if (meta.verifiedPayloadSha256 !== meta.candidateSha) throw new Error('preview payload binding does not match verified candidate');
  if (meta.previewIsolation?.generatedCodeOrigin !== 'opaque-origin-via-sandboxed-srcdoc' || meta.previewIsolation?.allowSameOrigin !== false) {
    throw new Error('preview is not bound to opaque-origin sandbox policy');
  }
  if (!host.includes('sandbox="allow-scripts"') || /sandbox="[^"]*allow-same-origin/.test(host)) {
    throw new Error('preview sandbox token policy is unsafe');
  }
  if (!host.includes(`data-verified-candidate-sha="${meta.candidateSha}"`)) {
    throw new Error('preview host does not bind the verified candidate SHA');
  }
  return actualHostSha;
}

const slug = arg('--slug') || '';
const action = arg('--action');
const reason = (arg('--reason') || '').trim();

if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`invalid slug: ${slug}`);
if (!['approve', 'reject'].includes(action)) throw new Error('action must be approve|reject');

const draftDir = path.join(PATHS.drafts, slug);
const meta = readJson(path.join(draftDir, 'meta.json'));
if (!meta) throw new Error(`no meta.json found under drafts/${slug}`);
if (meta.status !== 'awaiting-review') throw new Error(`draft is not awaiting review: ${meta.status}`);
assertSandboxedCandidate(draftDir, meta);

if (action === 'approve') {
  const dest = path.join(PATHS.products, slug);
  if (fs.existsSync(dest)) throw new Error(`product already exists: products/${slug}`);
  moveDir(draftDir, dest);
  meta.status = 'published'; meta.publishedAt = new Date().toISOString();
  writeJson(path.join(dest, 'meta.json'), meta);
  registerProduct({ slug, title: meta.title, genre: meta.genre, date: meta.date, status: 'published', score: meta.overall });
  bumpStats({ published: 1 });
  console.log(`PUBLISHED: products/${slug}/index.html`);
} else {
  const dest = path.join(ROOT, 'archive', `${slug}-${stampShort()}`);
  moveDir(draftDir, dest);
  meta.status = 'rejected'; meta.rejectionReason = reason || 'unspecified'; meta.rejectedAt = new Date().toISOString();
  writeJson(path.join(dest, 'meta.json'), meta);
  registerProduct({ slug, title: meta.title, genre: meta.genre, date: meta.date, status: 'rejected', score: meta.overall });
  bumpStats({ rejected: 1 });
  console.log(`ARCHIVED: ${path.relative(ROOT, dest)} (owner feedback stored separately; no active lesson created)`);
}
