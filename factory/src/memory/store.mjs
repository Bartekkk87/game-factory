import path from 'node:path';
import { PATHS } from '../config.mjs';
import { readJson, writeJson } from '../util/fsx.mjs';

const FILE = path.join(PATHS.memoryDir, 'memory.json');

const EMPTY = {
  products: [],
  lessons: [],
  stats: { runs: 0, published: 0, rejected: 0, failed: 0, tokens: 0, costUsd: 0 }
};

function normalizeLesson(lesson) {
  if (lesson && typeof lesson === 'object' && Object.hasOwn(lesson, 'status') && Object.hasOwn(lesson, 'active')) {
    return { ...lesson };
  }
  return { ...(lesson || {}), status: 'legacy-unvalidated', active: false };
}

export function loadMemory() {
  const stored = readJson(FILE, {});
  const merged = structuredClone(EMPTY);
  merged.products = stored.products ?? [];
  merged.lessons = (stored.lessons ?? []).map(normalizeLesson);
  merged.stats = { ...merged.stats, ...(stored.stats ?? {}) };
  return merged;
}

export function saveMemory(memory) {
  writeJson(FILE, { ...memory, lessons: (memory.lessons ?? []).map(normalizeLesson) });
}

export function lessonsFor(role, limit = 12) {
  return loadMemory()
    .lessons.filter((lesson) => lesson.role === role && lesson.status === 'validated' && lesson.active === true)
    .slice(-limit)
    .map((lesson) => `- ${lesson.text}`);
}

// There is intentionally no direct lesson-write helper. Active Production
// lessons can only be materialized by the SHA/PR/merge-bound promotion path in
// learning/lifecycle.mjs.

export function knownConcepts(limit = 30) {
  return loadMemory()
    .products.slice(-limit)
    .map((product) => ({
      title: product.title,
      genre: product.genre ?? null,
      status: product.status,
      score: product.score ?? null
    }));
}

export function registerProduct(entry) {
  const memory = loadMemory();
  const index = memory.products.findIndex((product) => product.slug === entry.slug);
  if (index >= 0) memory.products[index] = { ...memory.products[index], ...entry };
  else memory.products.push(entry);
  saveMemory(memory);
}

export function bumpStats(delta) {
  const memory = loadMemory();
  for (const key of Object.keys(delta)) memory.stats[key] = (memory.stats[key] ?? 0) + delta[key];
  saveMemory(memory);
}
