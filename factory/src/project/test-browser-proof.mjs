import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBrowserBootProof, WEB_RUNTIME_ADAPTER_SCHEMA } from './web-runtime-adapter.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-project-browser-'));
const contract = {
  schemaVersion: WEB_RUNTIME_ADAPTER_SCHEMA,
  entry: '/index.html',
  frameSelector: 'iframe',
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

try {
  fs.writeFileSync(path.join(temp, 'index.html'), '<!doctype html><iframe sandbox="allow-scripts" src="play.html"></iframe>');
  fs.writeFileSync(path.join(temp, 'play.html'), `<!doctype html>
<main id="game-root" data-game-ready="true" style="width:640px;height:360px;background:#123;color:white">
  <canvas id="game-canvas" width="320" height="180"></canvas>
  <button id="mine">Mine</button><output id="metal">0</output>
</main>
<script>document.querySelector('#mine').onclick=()=>document.querySelector('#metal').textContent='1';</script>`);
  const passing = await runBrowserBootProof({ projectRoot: temp, contract });
  assert.equal(passing.pass, true, JSON.stringify(passing.failures));

  fs.writeFileSync(path.join(temp, 'play.html'), '<!doctype html><style>html,body{background:#000}</style>');
  const blank = await runBrowserBootProof({ projectRoot: temp, contract, timeoutMs: 500 });
  assert.equal(blank.pass, false);
  assert.equal(blank.failures.some((failure) => ['runtime-ready', 'game-root-visible', 'game-content-visible', 'gameplay-interaction'].includes(failure.id)), true);
  console.log('Project Game browser boot/blank-screen proof selftest: PASS');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
