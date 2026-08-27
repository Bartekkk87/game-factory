import path from 'node:path';
import { PATHS } from '../config.mjs';
import { readJson, writeJson } from '../util/fsx.mjs';

const FILE = path.join(PATHS.memoryDir, 'memory.json');

const EMPTY = {
  products: [],
  lessons: [],
  stats: { runs: 0, published: 0, rejected: 0, failed: 0, tokens: 0, costUsd: 0 }
};

function normalizeLesson(l) {
  if (l && typeof l === 'object' && Object.hasOwn(l, 'status') && Object.hasOwn(l, 'active')) return { ...l };
  return { ...(l || {}), status: 'legacy-unvalidated', active: false };
}

export function loadMemory() {
  const stored = readJson(FILE, {});
  const merged = structuredClone(EMPTY);
  merged.products = stored.products ?? [];
  merged.lessons = (stored.lessons ?? []).map(normalizeLesson);
  merged.stats = { ...merged.stats, ...(stored.stats ?? {}) };
  return merged;
}

export function saveMemory(m) {
  writeJson(FILE, { ...m, lessons: (m.lessons ?? []).map(normalizeLesson) });
}

export function lessonsFor(role, limit = 12) {
  return loadMemory()
    .lessons.filter((l) => l.role === role && l.status === 'validated' && l.active === true)
    .slice(-limit)
    .map((l) => `- ${l.text}`);
}

// Direct calls are fail-closed. Promotion through learning/lifecycle.mjs is the
// only supported way to create an active production lesson.
export function recordLesson(role, text, metadata = {}) {
  const m = loadMemory();
  if (!m.lessons.some((l) => l.text === text && l.role === role)) {
    m.lessons.push({
      date: new Date().toISOString().slice(0, 10),
      role,
      text,
      ...metadata,
      status: metadata.status === 'validated' ? 'validated' : 'candidate',
      active: metadata.status === 'validated' && metadata.active === true
    });
  }
  saveMemory(m);
}

export function knownConcepts(limit = 30) {
  return loadMemory()
    .products.slice(-limit)
    .map((p) => ({ title: p.title, genre: p.genre ?? null, status: p.status, score: p.score ?? null }));
}

export function registerProduct(entry) {
  const m = loadMemory();
  const i = m.products.findIndex((p) => p.slug === entry.slug);
  if (i >= 0) m.products[i] = { ...m.products[i], ...entry };
  else m.products.push(entry);
  saveMemory(m);
}

export function bumpStats(delta) {
  const m = loadMemory();
  for (const k of Object.keys(delta)) m.stats[k] = (m.stats[k] ?? 0) + delta[k];
  saveMemory(m);
}
