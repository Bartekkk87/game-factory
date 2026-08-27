import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { serveDir } from './server.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const DEFAULT_VERIFIER_SEED = 0x47facade;

const PLAY_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter'];
const POINTER_PATH = [
  [420, 300],
  [640, 280],
  [820, 360],
  [700, 480],
  [480, 460],
  [560, 350]
];
const INPUT_PLAN = Object.freeze({
  keys: PLAY_KEYS,
  pointerPath: POINTER_PATH,
  keyEveryMs: 190,
  keyHoldMs: 110,
  pointerEveryMs: 450,
  clickEveryMs: 1300
});

function normalizeSeed(seed) {
  const n = Number(seed);
  return Number.isFinite(n) ? (Math.trunc(n) >>> 0) : DEFAULT_VERIFIER_SEED;
}

export async function runSession({ root, entry = '/index.html', seconds = 10, screenshotDir = null, seed = DEFAULT_VERIFIER_SEED }) {
  const verifierSeed = normalizeSeed(seed);
  const { url, close } = await serveDir(root);
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(({ seeded }) => {
    let s = seeded >>> 0 || 1;
    const next = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
    Object.defineProperty(window, '__GF_VERIFIER_SEED__', {
      value: seeded >>> 0,
      configurable: false,
      enumerable: false,
      writable: false
    });
    Math.random = next;
  }, { seeded: verifierSeed });
  const page = await context.newPage();
  await context.route('**/favicon.ico', (route) => route.abort());

  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const requestFailed = [];
  const httpIssues = [];

  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
    else if (m.type() === 'warning') consoleWarnings.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
  page.on('requestfailed', (r) => requestFailed.push(`${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('favicon')) httpIssues.push(`${r.status()} ${r.url()}`);
  });

  const shots = [];
  let probeOk = false;
  let pageTitle = null;
  let startSnapshot = null;
  let earlySnapshot = null;
  let midSnapshot = null;
  let endSnapshot = null;
  let fps = null;
  const timeline = [];

  const snap = () =>
    page.evaluate(() => ({
      state: window.__GF__ ? window.__GF__.getState() : null,
      score: window.__GF__ ? window.__GF__.getScore() : null,
      best: window.__GF__ ? window.__GF__.getBest() : null,
      fps: window.__GF__ ? window.__GF__.getFps() : null,
      time: window.__GF__ ? window.__GF__.getTime() : null,
      flags: window.__GF__ ? Object.keys(window.__GF__.flags || {}) : [],
      errors: window.__GF__ ? [...(window.__GF__.errors || [])] : [],
      events: window.__GF__
        ? (typeof window.__GF__.getEvents === 'function'
            ? window.__GF__.getEvents()
            : Array.isArray(window.__GF__.events)
              ? [...window.__GF__.events]
              : [])
        : []
    }));

  const record = async (phase, atMs) => {
    const snapshot = await snap();
    timeline.push({ phase, atMs, snapshot });
    return snapshot;
  };

  const takeShot = async (name) => {
    const buf = await page.screenshot({ type: 'png' });
    if (screenshotDir) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      fs.writeFileSync(path.join(screenshotDir, `${name}.png`), buf);
    }
    shots.push({ name, dataUrl: `data:image/png;base64,${buf.toString('base64')}` });
  };

  try {
    await page.goto(url + entry, { waitUntil: 'load', timeout: 20000 });
    pageTitle = await page.title();
    await page
      .waitForFunction(() => window.__GF__ && typeof window.__GF__.getScore === 'function', null, {
        timeout: 8000,
        polling: 250
      })
      .then(() => {
        probeOk = true;
      })
      .catch(() => {});

    if (probeOk) {
      await sleep(700);
      await takeShot('shot-1-title');
      startSnapshot = await record('start', 0);
      await page.keyboard.press('Enter');
      await page.mouse.click(640, 400);

      let keyIndex = 0;
      let pointerIndex = 0;
      let clickIndex = 0;
      const inputTimer = setInterval(() => {
        const key = PLAY_KEYS[keyIndex % PLAY_KEYS.length];
        keyIndex++;
        page.keyboard.down(key).catch(() => {});
        setTimeout(() => page.keyboard.up(key).catch(() => {}), INPUT_PLAN.keyHoldMs);
      }, INPUT_PLAN.keyEveryMs);
      const mouseTimer = setInterval(() => {
        const [x, y] = POINTER_PATH[pointerIndex % POINTER_PATH.length];
        pointerIndex++;
        page.mouse.move(x, y).catch(() => {});
      }, INPUT_PLAN.pointerEveryMs);
      const clickTimer = setInterval(() => {
        const [x, y] = POINTER_PATH[clickIndex % POINTER_PATH.length];
        clickIndex++;
        page.mouse.click(x, y).catch(() => {});
      }, INPUT_PLAN.clickEveryMs);

      try {
        const total = seconds * 1000;
        const earlyAt = Math.max(500, Math.min(1200, total * 0.2));
        const midAt = Math.max(earlyAt + 300, Math.min(3500, total * 0.5));
        const sessionStarted = Date.now();
        const waitUntil = async (targetMs) => {
          const remaining = targetMs - (Date.now() - sessionStarted);
          if (remaining > 0) await sleep(remaining);
        };

        await waitUntil(earlyAt);
        earlySnapshot = await record('early', Math.round(earlyAt));
        await waitUntil(midAt);
        midSnapshot = await record('mid', Math.round(midAt));

        fps = await page.evaluate(
          () =>
            new Promise((res) => {
              let c = 0;
              const t0 = performance.now();
              const f = () => {
                c++;
                if (performance.now() - t0 < 2000) requestAnimationFrame(f);
                else res(Math.round(c / 2));
              };
              requestAnimationFrame(f);
            })
        );
        await waitUntil(total * 0.72);
        await takeShot('shot-2-gameplay');
        await waitUntil(total * 0.92);
        await takeShot('shot-3-gameplay');
        await waitUntil(total);
      } finally {
        clearInterval(inputTimer);
        clearInterval(mouseTimer);
        clearInterval(clickTimer);
      }
      endSnapshot = await record('end', seconds * 1000);
    }
  } catch (e) {
    pageErrors.push(String(e?.message || e));
  }

  await browser.close();
  close();

  return {
    seed: verifierSeed,
    inputSequence: {
      seed: verifierSeed,
      keys: [...INPUT_PLAN.keys],
      pointerPath: INPUT_PLAN.pointerPath.map((p) => [...p]),
      keyEveryMs: INPUT_PLAN.keyEveryMs,
      keyHoldMs: INPUT_PLAN.keyHoldMs,
      pointerEveryMs: INPUT_PLAN.pointerEveryMs,
      clickEveryMs: INPUT_PLAN.clickEveryMs
    },
    timeline,
    probeOk,
    pageTitle: pageTitle ?? null,
    httpIssues,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    requestFailed,
    fps,
    startSnapshot,
    earlySnapshot,
    midSnapshot,
    endSnapshot,
    screenshots: shots.map((s) => ({ name: s.name })),
    _images: shots.map((s) => ({ name: s.name, dataUrl: s.dataUrl }))
  };
}
