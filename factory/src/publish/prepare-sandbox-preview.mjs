import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../config.mjs';
import { readJson, sha256, writeJson } from '../util/fsx.mjs';
import { assembleSandboxHost, sandboxHostPolicy } from './sandbox-host.mjs';

export function prepareSandboxPreview(draftDir) {
  const metaFile = path.join(draftDir, 'meta.json');
  const indexFile = path.join(draftDir, 'index.html');
  const meta = readJson(metaFile, null);
  if (!meta || meta.status !== 'awaiting-review') return { changed: false, reason: 'not-awaiting-review' };
  if (!fs.existsSync(indexFile)) throw new Error(`sandbox preview missing index.html: ${draftDir}`);

  const current = fs.readFileSync(indexFile, 'utf8');
  if (meta.previewHostSha256) {
    const actual = sha256(Buffer.from(current));
    if (actual !== meta.previewHostSha256) throw new Error(`sandbox preview host SHA mismatch: ${draftDir}`);
    return { changed: false, hostSha256: actual };
  }

  const rawSha = sha256(Buffer.from(current));
  if (!meta.candidateSha || rawSha !== meta.candidateSha) {
    throw new Error(`verified candidate SHA mismatch before sandbox wrapping: ${draftDir}`);
  }

  const host = assembleSandboxHost({ title: meta.title, gameHtml: current, candidateSha: meta.candidateSha });
  const hostSha256 = sha256(Buffer.from(host));
  fs.writeFileSync(indexFile, host);
  writeJson(metaFile, {
    ...meta,
    previewHostSha256: hostSha256,
    previewIsolation: sandboxHostPolicy(),
    verifiedPayloadSha256: meta.candidateSha
  });
  return { changed: true, hostSha256, verifiedPayloadSha256: meta.candidateSha };
}

export function prepareAllSandboxPreviews() {
  if (!fs.existsSync(PATHS.drafts)) return [];
  return fs.readdirSync(PATHS.drafts, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ slug: entry.name, ...prepareSandboxPreview(path.join(PATHS.drafts, entry.name)) }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const results = prepareAllSandboxPreviews();
  console.log(`sandbox previews prepared: ${results.filter((item) => item.changed).length}`);
}
