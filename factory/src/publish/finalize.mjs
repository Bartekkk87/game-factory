import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PATHS } from '../config.mjs';
import { readJson, writeJson, sha256 } from '../util/fsx.mjs';
import { registerProduct, bumpStats, recordLesson } from '../memory/store.mjs';

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
  try {
    fs.renameSync(src, dest);
  } catch {
    fs.cpSync(src, dest, { recursive: true });
    fs.rmSync(src, { recursive: true, force: true });
  }
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

const candidateFile = path.join(draftDir, 'index.html');
if (!fs.existsSync(candidateFile)) throw new Error(`missing candidate: drafts/${slug}/index.html`);
const actualSha = sha256(fs.readFileSync(candidateFile));
if (!meta.candidateSha || actualSha !== meta.candidateSha) {
  throw new Error(`candidate SHA mismatch for ${slug}: expected ${meta.candidateSha || 'missing'}, got ${actualSha}`);
}

if (action === 'approve') {
  const dest = path.join(PATHS.products, slug);
  if (fs.existsSync(dest)) throw new Error(`product already exists: products/${slug}`);
  moveDir(draftDir, dest);
  meta.status = 'published';
  meta.publishedAt = new Date().toISOString();
  writeJson(path.join(dest, 'meta.json'), meta);
  registerProduct({ slug, title: meta.title, genre: meta.genre, date: meta.date, status: 'published', score: meta.overall });
  bumpStats({ published: 1 });
  console.log(`PUBLISHED: products/${slug}/index.html`);
} else {
  const dest = path.join(ROOT, 'archive', `${slug}-${stampShort()}`);
  moveDir(draftDir, dest);
  meta.status = 'rejected';
  meta.rejectionReason = reason || 'unspecified';
  meta.rejectedAt = new Date().toISOString();
  writeJson(path.join(dest, 'meta.json'), meta);
  registerProduct({ slug, title: meta.title, genre: meta.genre, date: meta.date, status: 'rejected', score: meta.overall });
  bumpStats({ rejected: 1 });
  recordLesson('director', `Owner rejected "${meta.title}" (${slug}). Reason: ${reason || 'unspecified'}. Avoid repeating this concept/mechanic pattern unless the owner explicitly asks.`);
  console.log(`ARCHIVED: ${path.relative(ROOT, dest)} (lesson recorded)`);
}
