import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

function findRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, 'factory', 'src', 'project', 'persistence-host-bridge.mjs'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) throw new Error('repository root not found from Project transaction staging');
    current = parent;
  }
}

function mime(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.mjs') || file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function safeFile(root, relative) {
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('static path escape');
  return target;
}

async function startServer(projectRoot, hostRoot) {
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      let root;
      let relative;
      if (url.pathname.startsWith('/project/')) {
        root = projectRoot;
        relative = url.pathname.slice('/project/'.length);
      } else if (url.pathname.startsWith('/host/')) {
        root = hostRoot;
        relative = url.pathname.slice('/host/'.length);
      } else {
        response.writeHead(404);
        response.end('not found');
        return;
      }
      const file = safeFile(root, relative);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404);
        response.end('not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-store' });
      response.end(fs.readFileSync(file));
    } catch (error) {
      response.writeHead(500);
      response.end(String(error.message || error));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

async function gameFrame(page) {
  const locator = page.locator('#game-frame');
  await locator.waitFor({ state: 'attached' });
  const handle = await locator.elementHandle();
  const frame = handle ? await handle.contentFrame() : null;
  assert.ok(frame, 'Kepler game iframe must resolve');
  await frame.locator('[data-game-ready="true"]').waitFor({ state: 'visible' });
  return frame;
}

async function durableState(frame) {
  const raw = await frame.locator('#game-root').getAttribute('data-durable-state');
  assert.ok(raw, 'complete durable state must be exposed for independent verification');
  return JSON.parse(raw);
}

const projectRoot = path.resolve(process.cwd());
const repoRoot = findRepoRoot(projectRoot);
const runtime = JSON.parse(fs.readFileSync(path.join(projectRoot, 'persistence', 'web-runtime.json'), 'utf8'));
const persistenceModule = pathToFileURL(
  path.join(repoRoot, 'factory', 'src', 'project', 'persistence-contract.mjs')
).href;
const { comparePersistedState } = await import(persistenceModule);
const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kepler-host-'));
const bridgeSource = fs.readFileSync(
  path.join(repoRoot, 'factory', 'src', 'project', 'persistence-host-bridge.mjs'),
  'utf8'
);
fs.writeFileSync(path.join(hostRoot, 'persistence-host-bridge.mjs'), bridgeSource);
fs.writeFileSync(path.join(hostRoot, 'index.html'), `<!doctype html>
<meta charset="utf-8">
<iframe id="game-frame" sandbox="allow-scripts" src="/project/${runtime.entry}"></iframe>
<script type="module">
import { installPersistenceHostBridge } from './persistence-host-bridge.mjs';
const frame = document.querySelector('#game-frame');
installPersistenceHostBridge({
  hostWindow: window,
  frame,
  projectId: 'kepler-outpost',
  contract: ${JSON.stringify(runtime.persistence)}
});
document.documentElement.dataset.bridgeReady = 'true';
</script>
`);

const server = await startServer(projectRoot, hostRoot);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error.message || error)));
try {
  await page.goto(`${server.url}/host/index.html`, { waitUntil: 'load' });
  await page.locator('html[data-bridge-ready="true"]').waitFor({ state: 'attached' });
  let frame = await gameFrame(page);

  assert.equal(await frame.locator('#power').textContent(), '0');
  assert.equal(await frame.locator('#ore').textContent(), '0');
  assert.equal(await frame.locator('#turn').textContent(), '0');

  await frame.locator('#generate').click();
  await frame.locator('#mine').click();
  const expectedState = { power: 1, ore: 1, turn: 2 };
  assert.deepEqual(await durableState(frame), expectedState);

  await frame.locator('#save').click();
  await frame.locator('#status').filter({ hasText: 'saved' }).waitFor({ state: 'visible' });

  await page.reload({ waitUntil: 'load' });
  await page.locator('html[data-bridge-ready="true"]').waitFor({ state: 'attached' });
  frame = await gameFrame(page);
  assert.deepEqual(await durableState(frame), { power: 0, ore: 0, turn: 0 });

  await frame.locator('#load').click();
  await frame.locator('#status').filter({ hasText: 'loaded' }).waitFor({ state: 'visible' });
  const actualState = await durableState(frame);
  const comparison = comparePersistedState(runtime.persistence, expectedState, actualState);
  assert.equal(comparison.pass, true, JSON.stringify(comparison.differences));
  assert.deepEqual(Object.keys(actualState).sort(), ['ore', 'power', 'turn']);

  assert.deepEqual(errors, []);
  console.log('Kepler M1 browser persistence: PASS');
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(hostRoot, { recursive: true, force: true });
}
