import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../config.mjs';

export const LESSON_SCHEMA = 'learning-lesson/v2';
export const MAX_LESSON_DIRECTIVE_CHARS = 800;
export const MAX_PRODUCTION_LESSONS = 12;

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
  if (!lesson || typeof lesson !== 'object') return { status: 'legacy-unvalidated', active: false };
  if (lesson.schemaVersion === LESSON_SCHEMA) return { ...lesson };

  // Deterministic migration is allowed only for an older lesson that already
  // carries the full governed promotion provenance. Untyped/free-form memory
  // without that evidence remains inactive and cannot reach Production prompts.
  const governedLegacy = lesson.status === 'validated'
    && lesson.active === true
    && lesson.targetLayer === 'prompt'
    && typeof lesson.text === 'string'
    && lesson.text.trim().length > 0
    && lesson.text.length <= MAX_LESSON_DIRECTIVE_CHARS
    && typeof lesson.role === 'string'
    && typeof lesson.scope === 'string'
    && Array.isArray(lesson.sourceRunIds)
    && Array.isArray(lesson.ownerFeedbackIds)
    && typeof lesson.promotionRef === 'string'
    && typeof lesson.mergeCommitSha === 'string'
    && /^[0-9a-f]{64}$/.test(String(lesson.candidateArtifactSha256 || ''));
  if (governedLegacy) {
    return {
      ...lesson,
      schemaVersion: LESSON_SCHEMA,
      directive: lesson.text
    };
  }
  return { ...lesson, status: lesson.status || 'legacy-unvalidated', active: false };
}

export function assertProductionLesson(lesson) {
  if (!lesson || lesson.schemaVersion !== LESSON_SCHEMA) throw new Error('production lesson schema invalid');
  for (const key of ['id', 'role', 'scope', 'targetLayer', 'directive', 'status']) {
    if (typeof lesson[key] !== 'string' || !lesson[key].trim()) throw new Error(`production lesson missing ${key}`);
  }
  if (lesson.status !== 'validated' || lesson.active !== true) throw new Error('production lesson must be validated and active');
  if (lesson.targetLayer !== 'prompt') throw new Error('production lesson must target prompt layer');
  if (lesson.directive.length > MAX_LESSON_DIRECTIVE_CHARS) throw new Error('production lesson directive exceeds bound');
  if (!Array.isArray(lesson.sourceRunIds) || !Array.isArray(lesson.ownerFeedbackIds)) throw new Error('production lesson provenance arrays required');
  if (!lesson.promotionRef || !lesson.mergeCommitSha || !/^[0-9a-f]{64}$/.test(String(lesson.candidateArtifactSha256 || ''))) {
    throw new Error('production lesson promotion provenance incomplete');
  }
  return { ...lesson };
}

function isSafeProductionLesson(lesson, role) {
  try {
    const validated = assertProductionLesson(lesson);
    return validated.role === role;
  } catch {
    return false;
  }
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

function syncSleep(ms) { Atomics.wait(sleepCell, 0, 0, ms); }

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

  const saveMemory = (incoming) => updateMemory((current) => ({
    ...current,
    products: mergeByKey(current.products, incoming?.products ?? [], (item) => item?.slug || null),
    lessons: mergeByKey(current.lessons, (incoming?.lessons ?? []).map(normalizeLesson), (item) => item?.id || null),
    stats: current.stats
  }));

  const lessonsFor = (role, limit = MAX_PRODUCTION_LESSONS) => loadMemory()
    .lessons
    .filter((lesson) => isSafeProductionLesson(lesson, role))
    .slice(-Math.min(Math.max(0, Number(limit) || 0), MAX_PRODUCTION_LESSONS))
    .map((lesson) => ({
      schemaVersion: lesson.schemaVersion,
      id: lesson.id,
      role: lesson.role,
      scope: lesson.scope,
      targetLayer: lesson.targetLayer,
      directive: lesson.directive,
      sourceRunIds: [...lesson.sourceRunIds],
      ownerFeedbackIds: [...lesson.ownerFeedbackIds],
      promotionRef: lesson.promotionRef,
      mergeCommitSha: lesson.mergeCommitSha,
      candidateArtifactSha256: lesson.candidateArtifactSha256
    }));

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

// No direct lesson-write helper exists. Active Production lessons are accepted
// only when they carry the typed schema and merge-bound promotion provenance.
