import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return file;
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text);
  return file;
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function readFileB64(file) {
  return fs.promises.readFile(file).then((b) => b.toString('base64'));
}
