import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { serveDir } from './server.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PLAY_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter'];

export async function runSession({ root, entry = '/index.html', seconds = 10, screenshotDir = null }) {
  const { url, close } = await serveDir(root);
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
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
  let midSnapshot = null;
  let endSnapshot = null;
  let fps = null;

  const snap = () =>
    page.evaluate(() => ({
      state: window.__GF__ ? window.__GF__.getState() : null,
      score: window.__GF__ ? window.__GF__.getScore() : null,
      best: window.__GF__ ? window.__GF__.getBest() : null,
      fps: window.__GF__ ? window.__GF__.getFps() : null,
      time: window.__GF__ ? window.__GF__.getTime() : null,
      flags: window.__GF__ ? Object.keys(window.__GF__.flags || {}) : [],
      errors: window.__GF__ ? [...(window.__GF__.errors || [])] : []
    }));

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
      await page.keyboard.press('Enter');
      await page.mouse.click(640, 400);

      const inputTimer = setInterval(() => {
        const key = PLAY_KEYS[(Math.random() * PLAY_KEYS.length) | 0];
        page.keyboard.down(key).catch(() => {});
        setTimeout(() => page.keyboard.up(key).catch(() => {}), 110);
      }, 190);
      const mouseTimer = setInterval(() => {
        page.mouse.move(300 + Math.random() * 680, 200 + Math.random() * 320).catch(() => {});
      }, 450);
      const clickTimer = setInterval(() => {
        page.mouse.click(400 + Math.random() * 480, 250 + Math.random() * 260).catch(() => {});
      }, 1300);

      try {
        const total = seconds * 1000;
        const half = Math.min(3500, total / 2);
        await sleep(half);
        midSnapshot = await snap();
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
        const elapsed = half + 2100;
        await sleep(Math.max(150, total * 0.72 - elapsed));
        await takeShot('shot-2-gameplay');
        await sleep(Math.max(150, total * 0.92 - total * 0.72));
        await takeShot('shot-3-gameplay');
        await sleep(Math.max(150, total - total * 0.92));
      } finally {
        clearInterval(inputTimer);
        clearInterval(mouseTimer);
        clearInterval(clickTimer);
      }
      endSnapshot = await snap();
    }
  } catch (e) {
    pageErrors.push(String(e?.message || e));
  }

  await browser.close();
  close();

  return {
    probeOk,
    pageTitle: pageTitle ?? null,
    httpIssues,
    consoleErrors,
    consoleWarnings,
    pageErrors,
    requestFailed,
    fps,
    midSnapshot,
    endSnapshot,
    screenshots: shots.map((s) => ({ name: s.name })),
    _images: shots.map((s) => ({ name: s.name, dataUrl: s.dataUrl }))
  };
}
