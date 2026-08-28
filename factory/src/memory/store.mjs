import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../config.mjs';

const DEFAULT_FILE = path.join(PATHS.memoryDir, 'memory.json');
const LOCK_WAIT_MS = 10;
const LOCK_TIMEOUT_MS = 15000;
const LOCK_STALE_MS = 60000;
const sleepCell = new Int32Array(new SharedArrayBuffer(4));

const EMPTY = {
  products: [],
  lessons: [],
  stats: { runs: 0, published: 0, rejected: 0, failed: 0, tokens: 0, costUsd: 0 }
};

function normalizeLesson(lesson) {
  if (lesson && typeof lesson === 'object' && Object.hasOwn(lesson, 'status') && Object.hasOwn(lesson, 'active')) return { ...lesson };
  return { ...(lesson || {}), status: 'legacy-unvalidated', active: false };
}

function normalizeMemory(stored = {}) {
  const merged = structuredClone(EMPTY);
  merged.products = stored.products ?? [];
  merged.lessons = (stored.lessons ?? []).map(normalizeLesson);
  merged.stats = { ...merged.stats, ...(stored.stats ?? {}) };
  return merged;
}

function readFile(file) {
  try { return normalizeMemory(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch { return normalizeMemory(); }
}

function syncSleep(ms) {
  Atomics.wait(sleepCell, 0, 0, ms);
}

function acquireLock(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lockFile = `${file}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (true) {
    try {
      const fd = fs.openSync(lockFile, 'wx', 0o600);
      fs.writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
      return { fd, lockFile };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        const stat = fs.statSync(lockFile);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(lockFile);
          continue;
        }
      } catch (statError) {
        if (statError?.code === 'ENOENT') continue;
        throw statError;
      }
      if (Date.now() >= deadline) throw new Error(`memory lock timeout: ${lockFile}`);
      syncSleep(LOCK_WAIT_MS);
    }
  }
}

function releaseLock(lock) {
  try { fs.closeSync(lock.fd); } catch {}
  try { fs.unlinkSync(lock.lockFile); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
}

function atomicWrite(file, memory) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const normalized = normalizeMemory(memory);
  fs.writeFileSync(temp, `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
  return normalized;
}

function mergeByKey(current, incoming, keyFor) {
  const map = new Map(current.map((item) => [keyFor(item), item]));
  for (const item of incoming) {
    const key = keyFor(item);
    if (!key) continue;
    map.set(key, { ...(map.get(key) || {}), ...item });
  }
  return [...map.values()];
}

export function createMemoryStore(file = DEFAULT_FILE) {
  const updateMemory = (mutator) => {
    if (typeof mutator !== 'function') throw new Error('memory update requires a mutator function');
    const lock = acquireLock(file);
    try {
      const current = readFile(file);
      const draft = structuredClone(current);
      const result = mutator(draft);
      const next = normalizeMemory(result === undefined ? draft : result);
      return atomicWrite(file, next);
    } finally {
      releaseLock(lock);
    }
  };

  const loadMemory = () => readFile(file);

  // Compatibility write for governance code: merge only entity collections and
  // preserve the latest transactional stats so a stale snapshot cannot erase a
  // concurrent bumpStats update.
  const saveMemory = (incoming) => updateMemory((current) => ({
    ...current,
    products: mergeByKey(current.products, incoming?.products ?? [], (item) => item?.slug || null),
    lessons: mergeByKey(current.lessons, (incoming?.lessons ?? []).map(normalizeLesson), (item) => item?.id || null),
    stats: current.stats
  }));

  const lessonsFor = (role, limit = 12) => loadMemory()
    .lessons.filter((lesson) => lesson.role === role && lesson.status === 'validated' && lesson.active === true)
    .slice(-limit)
    .map((lesson) => `- ${lesson.text}`);

  const knownConcepts = (limit = 30) => loadMemory()
    .products.slice(-limit)
    .map((product) => ({ title: product.title, genre: product.genre ?? null, status: product.status, score: product.score ?? null }));

  const registerProduct = (entry) => updateMemory((memory) => {
    const index = memory.products.findIndex((product) => product.slug === entry.slug);
    if (index >= 0) memory.products[index] = { ...memory.products[index], ...entry };
    else memory.products.push(entry);
  });

  const bumpStats = (delta) => updateMemory((memory) => {
    for (const key of Object.keys(delta || {})) {
      const value = Number(delta[key]);
      if (!Number.isFinite(value)) throw new Error(`memory stat delta must be finite: ${key}`);
      memory.stats[key] = (Number(memory.stats[key]) || 0) + value;
    }
  });

  return Object.freeze({ file, loadMemory, saveMemory, updateMemory, lessonsFor, knownConcepts, registerProduct, bumpStats });
}

const defaultStore = createMemoryStore();
export const loadMemory = defaultStore.loadMemory;
export const saveMemory = defaultStore.saveMemory;
export const updateMemory = defaultStore.updateMemory;
export const lessonsFor = defaultStore.lessonsFor;
export const knownConcepts = defaultStore.knownConcepts;
export const registerProduct = defaultStore.registerProduct;
export const bumpStats = defaultStore.bumpStats;

// There is intentionally no direct lesson-write helper. Active Production
// lessons can only be materialized by the SHA/PR/merge-bound privileged
// governance path.
