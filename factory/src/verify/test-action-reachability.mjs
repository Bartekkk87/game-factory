import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from '../config.mjs';
import { serveDir } from './server.mjs';
import { runSession, DEFAULT_VERIFIER_SEED } from './harness.mjs';
import { VERIFIER_ACTION_POLICY, directionSweepsForSeed } from './action-policy.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fixtureRoot = path.join(ROOT, 'examples', 'fixtures', 'action-reachability');
const LEGACY_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter'];

async function runLegacyPulseBaseline() {
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
    if (!start || !target) throw new Error('fixture geometry unavailable');
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
      keyIndex++;
      await page.keyboard.down(key);
      await sleep(110);
      await page.keyboard.up(key);
      const box = await page.locator('#player').boundingBox();
      if (box) {
        const current = center(box);
        maxDisplacement = Math.max(maxDisplacement, Math.hypot(current.x - startCenter.x, current.y - startCenter.y));
      }
      const remainder = 190 - 110;
      if (remainder > 0) await sleep(remainder);
    }
    const final = await page.evaluate(() => ({ state: window.__GF__.getState(), score: window.__GF__.getScore() }));
    return { ...final, maxDisplacement, targetDistance };
  } finally {
    await browser.close();
    close();
  }
}

const legacy = await runLegacyPulseBaseline();
if (legacy.targetDistance < 300) {
  console.error(`D-1 fixture invalid: target is only ${legacy.targetDistance.toFixed(1)}px from spawn`);
  process.exit(1);
}
if (legacy.state === 'success' || Number(legacy.score) > 0 || legacy.maxDisplacement >= 100) {
  console.error(`D-1 baseline not reproduced: state=${legacy.state} score=${legacy.score} maxDisplacement=${legacy.maxDisplacement.toFixed(1)}px`);
  process.exit(1);
}

const report = await runSession({
  root: fixtureRoot,
  seconds: 12,
  stopStates: ['success'],
  seed: DEFAULT_VERIFIER_SEED
});
const activeState = report.endSnapshot?.state ?? null;
const activeScore = Number(report.endSnapshot?.score ?? 0);
const idleState = report.idleBaseline?.endSnapshot?.state ?? null;
const idleScore = Number(report.idleBaseline?.endSnapshot?.score ?? 0);
const resolved = report.inputSequence?.resolvedDirectionalSweeps || [];
const expectedFirst = directionSweepsForSeed(DEFAULT_VERIFIER_SEED)[0]?.id;

if (report.actionPolicy?.schemaVersion !== 'verifier-action-policy-v1'
  || report.inputSequence?.actionPolicyMode !== VERIFIER_ACTION_POLICY.mode
  || resolved[0]?.direction !== expectedFirst) {
  console.error(`D-1 action policy metadata missing/non-deterministic: ${JSON.stringify(report.inputSequence)}`);
  process.exit(1);
}
if (activeState !== 'success' || activeScore !== 1) {
  console.error(`D-1 repair failed: generic active harness did not reach target (state=${activeState}, score=${activeScore})`);
  process.exit(1);
}
if (idleState === 'success' || idleScore > 0) {
  console.error(`D-1 idle control failed independence: state=${idleState}, score=${idleScore}`);
  process.exit(1);
}

console.log(`D-1 ACTION REACHABILITY PASS: targetDistance=${legacy.targetDistance.toFixed(1)}px; legacyMaxDisplacement=${legacy.maxDisplacement.toFixed(1)}px; genericActive=${activeState}/${activeScore}; idle=${idleState}/${idleScore}; firstSweep=${resolved[0].direction}.`);
