import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMemoryStore } from './store.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-memory-'));
const file = path.join(root, 'memory.json');
const store = createMemoryStore(file);

try {
  const stale = store.loadMemory();
  store.bumpStats({ runs: 1, costUsd: 0.25 });

  stale.lessons.push({
    id: 'lesson-fixture',
    date: '2026-08-29',
    role: 'director',
    text: 'fixture',
    status: 'validated',
    active: true
  });
  store.saveMemory(stale);

  let current = store.loadMemory();
  assert.equal(current.stats.runs, 1, 'stale save erased a newer transactional stats update');
  assert.equal(current.stats.costUsd, 0.25);
  assert.equal(current.lessons.some((item) => item.id === 'lesson-fixture'), true);

  store.registerProduct({ slug: 'one', title: 'One', status: 'draft' });
  const staleProductView = store.loadMemory();
  store.registerProduct({ slug: 'two', title: 'Two', status: 'draft' });
  staleProductView.products = staleProductView.products.map((item) => item.slug === 'one' ? { ...item, status: 'published' } : item);
  store.saveMemory(staleProductView);

  current = store.loadMemory();
  assert.equal(current.products.find((item) => item.slug === 'one')?.status, 'published');
  assert.equal(current.products.some((item) => item.slug === 'two'), true, 'stale entity merge erased a concurrent product');

  store.updateMemory((memory) => {
    memory.stats.failed += 1;
  });
  assert.equal(store.loadMemory().stats.failed, 1);
  assert.equal(fs.existsSync(`${file}.lock`), false, 'memory lock leaked after transaction');
  assert.equal(fs.readdirSync(root).some((name) => name.endsWith('.tmp')), false, 'temporary atomic-write file leaked');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('transactional memory store selftest: PASS');
