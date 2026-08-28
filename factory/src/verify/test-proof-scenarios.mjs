import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSession } from './harness.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-proof-scenarios-'));
const runDir = path.join(root, 'run');
const attemptDir = path.join(runDir, 'attempt-01');
fs.mkdirSync(attemptDir, { recursive: true });

fs.writeFileSync(path.join(runDir, 'gdd.json'), JSON.stringify({
  proofPlan: {
    pass: true,
    scenarios: [
      { id: 'base', inputMode: 'active+idle-control', seconds: 1.5, stopStates: [], restartAtEnd: false },
      { id: 'success-proof', inputMode: 'active', seconds: 2, stopStates: ['success'], restartAtEnd: true },
      { id: 'failure-proof', inputMode: 'idle', seconds: 2, stopStates: ['failure'], restartAtEnd: true }
    ]
  }
}, null, 2));

fs.writeFileSync(path.join(attemptDir, 'index.html'), `<!doctype html>
<html><body><canvas id="game" width="960" height="540"></canvas><script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let state = 'title';
let score = 0;
let startedAt = performance.now();
let hadGameplayInput = false;
function startFresh(){ state = 'playing'; score = 0; hadGameplayInput = false; startedAt = performance.now(); }
addEventListener('keydown', (e) => {
  if (state === 'title') { startFresh(); return; }
  if (state === 'won' || state === 'gameover') { startFresh(); return; }
  if (state === 'playing') { hadGameplayInput = true; score = 10; }
});
setInterval(() => {
  if (state === 'playing' && performance.now() - startedAt > 350) state = hadGameplayInput ? 'won' : 'gameover';
}, 10);
function draw(){
  ctx.fillStyle = '#123456'; ctx.fillRect(0,0,960,540);
  ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif'; ctx.fillText(state, 30, 40);
  requestAnimationFrame(draw);
}
draw();
window.__GF__ = {
  flags: {}, errors: [], events: [],
  getState: () => state,
  getScore: () => score,
  getBest: () => score,
  getFps: () => 60,
  getTime: () => (performance.now() - startedAt) / 1000,
  getEvents: () => []
};
</script></body></html>`);

try {
  const report = await runSession({ root: attemptDir, seconds: 1.5 });
  const success = report.proofScenarios.find((s) => s.id === 'success-proof');
  const failure = report.proofScenarios.find((s) => s.id === 'failure-proof');
  assert(success && failure, 'both terminal proof scenarios must execute');
  assert.equal(success.endState, 'won', 'raw engine success state must be preserved as evidence');
  assert.equal(success.canonicalEndState, 'success');
  assert.equal(success.postRestartState, 'playing');
  assert.equal(failure.endState, 'gameover', 'raw engine failure state must be preserved as evidence');
  assert.equal(failure.canonicalEndState, 'failure');
  assert.equal(failure.postRestartState, 'playing');
  assert(report.timeline.some((e) => e.scenarioId === 'success-proof' && e.snapshot?.state === 'won'));
  assert(report.timeline.some((e) => e.scenarioId === 'failure-proof' && e.snapshot?.state === 'gameover'));
  assert.equal(report.pageErrors.length, 0);
  assert.equal(report.consoleErrors.length, 0);
  assert.equal(success.inputMode, 'active');
  console.log('proof scenario harness OK: terminal-safe active input preserves engine won/gameover states and explicit restart is harness-observed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
