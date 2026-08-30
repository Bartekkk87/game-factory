import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { serveDir } from '../verify/server.mjs';
import { createPersistenceContract } from './persistence-contract.mjs';
import { persistenceHostStorageKey } from './persistence-host-bridge.mjs';
import { runBrowserPersistenceProof, WEB_RUNTIME_ADAPTER_SCHEMA } from './web-runtime-adapter.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-project-persistence-browser-'));
const projectId = 'bridge-fixture';
const persistenceContract = createPersistenceContract({
  schemaVersion: '1.2.0',
  slots: 2,
  maxBytes: 512,
  transientStatePaths: ['transient']
});
const runtimeContract = {
  schemaVersion: WEB_RUNTIME_ADAPTER_SCHEMA,
  entry: '/index.html',
  frameSelector: '#game-frame',
  rootSelector: '#game-root',
  readySelector: '[data-game-ready="true"]',
  visibleSelector: '#game-canvas',
  interaction: {
    selector: '#mine',
    action: 'click',
    assertion: { type: 'text-change', selector: '#metal' }
  },
  persistenceBridge: {
    protocol: 'project-game.persistence-bridge/v1',
    transport: 'postMessage',
    allowSameOrigin: false
  }
};

async function frameFor(page, selector = '#game-frame') {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'attached' });
  const handle = await locator.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  assert.ok(frame, 'fixture iframe must resolve');
  await frame.waitForLoadState('load');
  return frame;
}

async function bridgeRequest(frame, request, timeoutMs = 2000) {
  return frame.evaluate(({ candidate, timeout }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error(`bridge response timeout: ${candidate.requestId}`));
    }, timeout);
    const onMessage = (event) => {
      if (event.source !== window.parent) return;
      const response = event.data;
      if (response?.protocol !== candidate.protocol || response?.type !== 'response') return;
      if (response?.requestId !== candidate.requestId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(response);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage(candidate, '*');
  }), { candidate: request, timeout: timeoutMs });
}

function request(type, requestId, overrides = {}) {
  const base = {
    protocol: 'project-game.persistence-bridge/v1',
    type,
    requestId,
    projectId,
    slot: 0,
    schemaVersion: persistenceContract.saveSchemaVersion
  };
  if (type === 'save') base.state = { world: { ticks: 1 }, inventory: { metal: 2 } };
  return { ...base, ...overrides };
}

try {
  const bridgeSource = fs.readFileSync(new URL('./persistence-host-bridge.mjs', import.meta.url), 'utf8');
  fs.writeFileSync(path.join(temp, 'persistence-host-bridge.mjs'), bridgeSource);
  fs.writeFileSync(path.join(temp, 'play.html'), `<!doctype html>
<main id="game-root" data-game-ready="true" style="width:640px;height:360px;background:#123;color:white">
  <canvas id="game-canvas" width="320" height="180"></canvas>
  <button id="mine">Mine</button><output id="metal">0</output>
</main>
<script>document.querySelector('#mine').onclick=()=>document.querySelector('#metal').textContent='1';</script>`);
  const installScript = `
import { installPersistenceHostBridge } from './persistence-host-bridge.mjs';
const frame = document.querySelector('#game-frame');
installPersistenceHostBridge({
  hostWindow: window,
  frame,
  projectId: ${JSON.stringify(projectId)},
  contract: ${JSON.stringify(persistenceContract)}
});
document.documentElement.dataset.bridgeReady = 'true';`;
  fs.writeFileSync(path.join(temp, 'index.html'), `<!doctype html>
<iframe id="game-frame" sandbox="allow-scripts" src="play.html"></iframe>
<script type="module">${installScript}</script>`);
  fs.writeFileSync(path.join(temp, 'same-origin.html'), `<!doctype html>
<iframe id="game-frame" sandbox="allow-scripts allow-same-origin" src="play.html"></iframe>
<script type="module">${installScript}</script>`);

  const positive = await runBrowserPersistenceProof({
    projectRoot: temp,
    contract: runtimeContract,
    persistenceContract,
    projectId,
    slot: 1,
    state: { world: { ticks: 42 }, inventory: { metal: 7 }, transient: 'ignored' }
  });
  assert.equal(positive.pass, true, JSON.stringify(positive.failures));
  assert.equal(positive.checks.some((check) => check.id === 'persistence-equivalence' && check.pass), true);

  const { url, close } = await serveDir(temp);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${url}/index.html`, { waitUntil: 'load' });
    await page.locator('html[data-bridge-ready="true"]').waitFor({ state: 'attached' });
    let frame = await frameFor(page);

    const wrongProject = await bridgeRequest(frame, request('load', 'wrong-project', { projectId: 'other-project' }));
    assert.equal(wrongProject.ok, false);
    assert.equal(wrongProject.code, 'project-mismatch');

    const wrongSlot = await bridgeRequest(frame, request('load', 'wrong-slot', { slot: 2 }));
    assert.equal(wrongSlot.ok, false);
    assert.equal(wrongSlot.code, 'slot-invalid');

    const wrongSchema = await bridgeRequest(frame, request('load', 'wrong-schema', { schemaVersion: '9.9.9' }));
    assert.equal(wrongSchema.ok, false);
    assert.equal(wrongSchema.code, 'schema-mismatch');

    const oversized = await bridgeRequest(frame, request('save', 'oversized', {
      state: { payload: 'x'.repeat(persistenceContract.maxBytes + 50) }
    }));
    assert.equal(oversized.ok, false);
    assert.equal(oversized.code, 'size-limit');

    const key = persistenceHostStorageKey(projectId, 0);
    await page.evaluate(({ storageKey }) => localStorage.setItem(storageKey, '{not-json'), { storageKey: key });
    const corrupt = await bridgeRequest(frame, request('load', 'corrupt'));
    assert.equal(corrupt.ok, false);
    assert.equal(corrupt.code, 'corrupt-save');
    assert.equal(corrupt.safeStart, true);
    const quarantine = await page.evaluate(({ storageKey }) => ({
      active: localStorage.getItem(storageKey),
      quarantined: localStorage.getItem(`${storageKey}:quarantine`)
    }), { storageKey: key });
    assert.equal(quarantine.active, null);
    assert.equal(quarantine.quarantined, '{not-json');

    await page.goto(`${url}/same-origin.html`, { waitUntil: 'load' });
    await page.locator('html[data-bridge-ready="true"]').waitFor({ state: 'attached' });
    frame = await frameFor(page);
    const sameOrigin = await bridgeRequest(frame, request('load', 'same-origin'));
    assert.equal(sameOrigin.ok, false);
    assert.equal(sameOrigin.code, 'origin-rejected');
  } finally {
    await browser.close();
    close();
  }

  console.log('Project Game browser persistence host bridge selftest: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
