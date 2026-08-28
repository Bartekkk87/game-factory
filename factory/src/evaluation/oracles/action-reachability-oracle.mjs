import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from '../../config.mjs';
import { serveDir } from '../../verify/server.mjs';
import { runSession, DEFAULT_VERIFIER_SEED } from '../../verify/harness.mjs';
import { VERIFIER_ACTION_POLICY, directionSweepsForSeed } from '../../verify/action-policy.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fixtureRoot = path.join(ROOT, 'examples', 'fixtures', 'action-reachability');
const LEGACY_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter'];

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

async function legacyPulseObservation() {
  const { url, close } = await serveDir(fixtureRoot);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let maxDisplacement = 0;
  let targetDistance = 0;
  try {
    await page.goto(`${url}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__GF__ && typeof window.__GF__.getState === 'function');
    const start = await page.locator('#player').boundingBox();
    const target = await page.locator('#target').boundingBox();
    assert.ok(start && target, 'fixture geometry unavailable');
    const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    const startCenter = center(start);
    const targetCenter = center(target);
    targetDistance = Math.hypot(targetCenter.x - startCenter.x, targetCenter.y - startCenter.y);
    await page.keyboard.press('Enter');
    await page.mouse.click(640, 400);
    const startedAt = Date.now();
    let keyIndex = 0;
    while (Date.now() - startedAt < 40000) {
      const key = LEGACY_KEYS[keyIndex % LEGACY_KEYS.length];
      keyIndex += 1;
      await page.keyboard.down(key);
      await sleep(110);
      await page.keyboard.up(key);
      const box = await page.locator('#player').boundingBox();
      if (box) {
        const current = center(box);
        maxDisplacement = Math.max(maxDisplacement, Math.hypot(current.x - startCenter.x, current.y - startCenter.y));
      }
      await sleep(80);
    }
    const final = await page.evaluate(() => ({ state: window.__GF__.getState(), score: window.__GF__.getScore() }));
    return { ...final, maxDisplacement, targetDistance };
  } finally {
    await browser.close();
    close();
  }
}

async function activeVsIdleObservation() {
  const report = await runSession({ root: fixtureRoot, seconds: 12, stopStates: ['success'], seed: DEFAULT_VERIFIER_SEED });
  const activeState = report.endSnapshot?.state ?? null;
  const activeScore = Number(report.endSnapshot?.score ?? 0);
  const idleState = report.idleBaseline?.endSnapshot?.state ?? null;
  const idleScore = Number(report.idleBaseline?.endSnapshot?.score ?? 0);
  const resolved = report.inputSequence?.resolvedDirectionalSweeps || [];
  const expectedFirst = directionSweepsForSeed(DEFAULT_VERIFIER_SEED)[0]?.id;
  assert.equal(report.actionPolicy?.schemaVersion, 'verifier-action-policy-v1');
  assert.equal(report.inputSequence?.actionPolicyMode, VERIFIER_ACTION_POLICY.mode);
  assert.equal(resolved[0]?.direction, expectedFirst);
  assert.equal(activeState, 'success');
  assert.equal(activeScore, 1);
  assert.notEqual(idleState, 'success');
  assert.equal(idleScore, 0);
}

const caseId = caseIdFromArgs();
if (caseId === 'gp-action-legacy-pulse-unreachable') {
  const legacy = await legacyPulseObservation();
  assert.ok(legacy.targetDistance >= 300, `target too close: ${legacy.targetDistance}`);
  assert.notEqual(legacy.state, 'success');
  assert.equal(Number(legacy.score), 0);
  assert.ok(legacy.maxDisplacement < 100, `legacy displacement unexpectedly reachable: ${legacy.maxDisplacement}`);
} else if (caseId === 'gp-action-reachability-active-vs-idle') {
  await activeVsIdleObservation();
} else {
  throw new Error(`unsupported action-reachability corpus case: ${caseId}`);
}

console.log(JSON.stringify({ caseId, observation: 'PASS' }));
