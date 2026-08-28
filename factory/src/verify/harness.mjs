import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { serveDir } from './server.mjs';
import { installCanvasLayoutProbe } from './layout-probe.mjs';
import { canonicalTerminalState, canonicalVerifierState } from './state-semantics.mjs';
import { VERIFIER_ACTION_POLICY, directionSweepsForSeed, verifierActionContract } from './action-policy.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const DEFAULT_VERIFIER_SEED = 0x47facade;

function normalizeSeed(seed) {
  const n = Number(seed);
  return Number.isFinite(n) ? (Math.trunc(n) >>> 0) : DEFAULT_VERIFIER_SEED;
}

function readProofPlan(root) {
  try {
    const gddPath = path.resolve(root, '..', 'gdd.json');
    if (!fs.existsSync(gddPath)) return null;
    const gdd = JSON.parse(fs.readFileSync(gddPath, 'utf8'));
    return gdd?.proofPlan?.pass === true ? gdd.proofPlan : null;
  } catch {
    return null;
  }
}

async function runSingleSession({
  root,
  entry = '/index.html',
  seconds = 10,
  screenshotDir = null,
  seed = DEFAULT_VERIFIER_SEED,
  inputMode = 'active',
  captureScreenshots = true,
  stopStates = [],
  restartAtEnd = false
}) {
  const verifierSeed = normalizeSeed(seed);
  if (!['active', 'idle'].includes(inputMode)) throw new Error(`unsupported verifier input mode: ${inputMode}`);
  const { url, close } = await serveDir(root);
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(installCanvasLayoutProbe);
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
  let postRestartSnapshot = null;
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
        : [],
      layout: window.__GF_CANVAS_LAYOUT_PROBE__ ? window.__GF_CANVAS_LAYOUT_PROBE__.snapshot() : null
    }));

  const record = async (phase, atMs) => {
    const snapshot = await snap();
    timeline.push({ phase, atMs, snapshot });
    return snapshot;
  };

  const takeShot = async (name, { requirePlaying = false, persist = true } = {}) => {
    if (!captureScreenshots) return false;
    if (requirePlaying) {
      const before = await snap();
      if (canonicalVerifierState(before?.state) !== 'playing') return false;
    }
    const buf = await page.screenshot({ type: 'png' });
    if (requirePlaying) {
      const after = await snap();
      if (canonicalVerifierState(after?.state) !== 'playing') return false;
    }
    if (persist && screenshotDir) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      fs.writeFileSync(path.join(screenshotDir, `${name}.png`), buf);
    }
    shots.push({ name, dataUrl: `data:image/png;base64,${buf.toString('base64')}` });
    return true;
  };

  const activeInputAllowed = async () => {
    try {
      const state = await page.evaluate(() => window.__GF__ && typeof window.__GF__.getState === 'function' ? window.__GF__.getState() : null);
      return canonicalTerminalState(state) === null;
    } catch {
      return false;
    }
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

      // Both active and idle sessions receive the same bounded start impulse so
      // the control measures gameplay effects, not whether the title screen was entered.
      await page.keyboard.press('Enter');
      await page.mouse.click(640, 400);

      const timers = [];
      let movementStopped = false;
      let movementTask = null;
      const heldMovementKeys = new Set();
      const releaseMovementKeys = async () => {
        const keys = [...heldMovementKeys];
        heldMovementKeys.clear();
        await Promise.all(keys.map((key) => page.keyboard.up(key).catch(() => {})));
      };

      if (inputMode === 'active') {
        const directionalSweeps = directionSweepsForSeed(verifierSeed);
        movementTask = (async () => {
          let sweepIndex = 0;
          while (!movementStopped) {
            if (!(await activeInputAllowed())) {
              await releaseMovementKeys();
              await sleep(50);
              continue;
            }
            const sweep = directionalSweeps[sweepIndex % directionalSweeps.length];
            sweepIndex++;
            for (const key of sweep.keys) {
              await page.keyboard.down(key).catch(() => {});
              heldMovementKeys.add(key);
            }
            const segmentStarted = Date.now();
            while (!movementStopped && Date.now() - segmentStarted < VERIFIER_ACTION_POLICY.movementSegmentMs) {
              if (!(await activeInputAllowed())) break;
              await sleep(50);
            }
            await releaseMovementKeys();
            if (!movementStopped && (await activeInputAllowed())) {
              await sleep(VERIFIER_ACTION_POLICY.movementGapMs);
            }
          }
        })().catch((e) => pageErrors.push(`directional sweeps: ${String(e?.message || e)}`));

        let pointerIndex = 0;
        let clickIndex = 0;
        let actionIndex = 0;
        timers.push(setInterval(async () => {
          if (!(await activeInputAllowed())) return;
          const key = VERIFIER_ACTION_POLICY.actionKeys[actionIndex % VERIFIER_ACTION_POLICY.actionKeys.length];
          actionIndex++;
          page.keyboard.press(key).catch(() => {});
        }, VERIFIER_ACTION_POLICY.actionEveryMs));
        timers.push(setInterval(async () => {
          if (!(await activeInputAllowed())) return;
          const [x, y] = VERIFIER_ACTION_POLICY.pointerPath[pointerIndex % VERIFIER_ACTION_POLICY.pointerPath.length];
          pointerIndex++;
          page.mouse.move(x, y).catch(() => {});
        }, VERIFIER_ACTION_POLICY.pointerEveryMs));
        timers.push(setInterval(async () => {
          if (!(await activeInputAllowed())) return;
          const [x, y] = VERIFIER_ACTION_POLICY.pointerPath[clickIndex % VERIFIER_ACTION_POLICY.pointerPath.length];
          clickIndex++;
          page.mouse.click(x, y).catch(() => {});
        }, VERIFIER_ACTION_POLICY.clickEveryMs));
      }

      const total = seconds * 1000;
      const sessionStarted = Date.now();
      let activityFramesCaptured = 0;
      const captureLiveActivityPair = async () => {
        if (!captureScreenshots || activityFramesCaptured >= 2) return;
        if (activityFramesCaptured === 0) {
          const firstCaptured = await takeShot('activity-1-gameplay', { requirePlaying: true, persist: false });
          if (!firstCaptured) return;
          activityFramesCaptured = 1;
        }
        if (activityFramesCaptured === 1) {
          await sleep(1000);
          const secondCaptured = await takeShot('activity-2-gameplay', { requirePlaying: true, persist: false });
          if (secondCaptured) activityFramesCaptured = 2;
        }
      };

      try {
        const targetStates = new Set();
        for (const state of stopStates || []) {
          const canonical = canonicalVerifierState(state);
          if (!canonical) throw new Error(`unsupported verifier stop state: ${String(state ?? 'missing')}`);
          targetStates.add(canonical);
        }
        if (targetStates.size) {
          while (Date.now() - sessionStarted < total) {
            const current = await snap();
            const currentState = canonicalVerifierState(current?.state);
            if (currentState && targetStates.has(currentState)) {
              const atMs = Date.now() - sessionStarted;
              timeline.push({ phase: 'terminal', atMs, snapshot: current });
              endSnapshot = current;
              break;
            }
            await sleep(50);
          }
          if (!endSnapshot) endSnapshot = await record('end', Math.min(total, Date.now() - sessionStarted));
        } else {
          const earlyAt = Math.max(500, Math.min(1200, total * 0.2));
          const midAt = Math.max(earlyAt + 300, Math.min(3500, total * 0.5));
          const waitUntil = async (targetMs) => {
            const remaining = targetMs - (Date.now() - sessionStarted);
            if (remaining > 0) await sleep(remaining);
          };

          await waitUntil(earlyAt);
          earlySnapshot = await record('early', Math.round(earlyAt));
          await captureLiveActivityPair();
          await waitUntil(midAt);
          midSnapshot = await record('mid', Math.round(midAt));
          await captureLiveActivityPair();

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
          endSnapshot = await record('end', seconds * 1000);
        }
      } finally {
        movementStopped = true;
        for (const timer of timers) clearInterval(timer);
        await releaseMovementKeys();
        if (movementTask) await movementTask;
      }

      if (restartAtEnd && canonicalTerminalState(endSnapshot?.state)) {
        await page.keyboard.press('Enter');
        await page.mouse.click(640, 400);
        await sleep(450);
        postRestartSnapshot = await record('post_restart', Math.min(total, Date.now() - sessionStarted) + 450);
      }
    }
  } catch (e) {
    pageErrors.push(String(e?.message || e));
  }

  await browser.close();
  close();

  const resolvedSweeps = inputMode === 'active'
    ? directionSweepsForSeed(verifierSeed).map((sweep) => ({ direction: sweep.id, keys: [...sweep.keys] }))
    : [];
  const allActiveKeys = inputMode === 'active'
    ? [...new Set([
        ...resolvedSweeps.flatMap((sweep) => sweep.keys),
        ...VERIFIER_ACTION_POLICY.actionKeys
      ])]
    : [];

  return {
    seed: verifierSeed,
    inputMode,
    actionPolicy: verifierActionContract(),
    inputSequence: {
      mode: inputMode,
      seed: verifierSeed,
      startImpulse: [...VERIFIER_ACTION_POLICY.startImpulse],
      actionPolicyMode: VERIFIER_ACTION_POLICY.mode,
      resolvedDirectionalSweeps: resolvedSweeps,
      keys: allActiveKeys,
      pointerPath: inputMode === 'active' ? VERIFIER_ACTION_POLICY.pointerPath.map((p) => [...p]) : [],
      keyEveryMs: null,
      keyHoldMs: inputMode === 'active' ? VERIFIER_ACTION_POLICY.movementSegmentMs : null,
      movementSegmentMs: inputMode === 'active' ? VERIFIER_ACTION_POLICY.movementSegmentMs : null,
      movementGapMs: inputMode === 'active' ? VERIFIER_ACTION_POLICY.movementGapMs : null,
      actionEveryMs: inputMode === 'active' ? VERIFIER_ACTION_POLICY.actionEveryMs : null,
      pointerEveryMs: inputMode === 'active' ? VERIFIER_ACTION_POLICY.pointerEveryMs : null,
      clickEveryMs: inputMode === 'active' ? VERIFIER_ACTION_POLICY.clickEveryMs : null,
      terminalSafe: inputMode === 'active'
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
    postRestartSnapshot,
    screenshots: shots.map((s) => ({ name: s.name })),
    _images: shots.map((s) => ({ name: s.name, dataUrl: s.dataUrl }))
  };
}

export async function runSession(options) {
  const active = await runSingleSession({ ...options, inputMode: 'active', captureScreenshots: true });
  const idle = await runSingleSession({ ...options, inputMode: 'idle', screenshotDir: null, captureScreenshots: false });
  const proofPlan = readProofPlan(options.root);
  const proofScenarios = [];
  const extraTimeline = [];
  const extraPageErrors = [];
  const extraConsoleErrors = [];
  const extraRequestFailed = [];

  for (const scenario of proofPlan?.scenarios || []) {
    if (!scenario || scenario.id === 'base') continue;
    const report = await runSingleSession({
      ...options,
      seconds: Number(scenario.seconds),
      inputMode: scenario.inputMode,
      screenshotDir: null,
      captureScreenshots: false,
      stopStates: Array.isArray(scenario.stopStates) ? scenario.stopStates : [],
      restartAtEnd: scenario.restartAtEnd === true
    });
    proofScenarios.push({
      id: scenario.id,
      purpose: scenario.purpose,
      inputMode: scenario.inputMode,
      seconds: Number(scenario.seconds),
      stopStates: Array.isArray(scenario.stopStates) ? [...scenario.stopStates] : [],
      endState: report.endSnapshot?.state ?? null,
      canonicalEndState: canonicalVerifierState(report.endSnapshot?.state),
      postRestartState: report.postRestartSnapshot?.state ?? null
    });
    for (const entry of report.timeline || []) {
      extraTimeline.push({ ...entry, scenarioId: scenario.id, phase: `${scenario.id}:${entry.phase}` });
    }
    extraPageErrors.push(...(report.pageErrors || []).map((e) => `[${scenario.id}] ${e}`));
    extraConsoleErrors.push(...(report.consoleErrors || []).map((e) => `[${scenario.id}] ${e}`));
    extraRequestFailed.push(...(report.requestFailed || []).map((e) => `[${scenario.id}] ${e}`));
  }

  return {
    ...active,
    timeline: [...(active.timeline || []), ...extraTimeline],
    pageErrors: [...(active.pageErrors || []), ...extraPageErrors],
    consoleErrors: [...(active.consoleErrors || []), ...extraConsoleErrors],
    requestFailed: [...(active.requestFailed || []), ...extraRequestFailed],
    proofPlan: proofPlan || null,
    proofScenarios,
    idleBaseline: {
      seed: idle.seed,
      inputMode: idle.inputMode,
      actionPolicy: idle.actionPolicy,
      inputSequence: idle.inputSequence,
      timeline: idle.timeline,
      probeOk: idle.probeOk,
      pageErrors: idle.pageErrors,
      consoleErrors: idle.consoleErrors,
      requestFailed: idle.requestFailed,
      startSnapshot: idle.startSnapshot,
      earlySnapshot: idle.earlySnapshot,
      midSnapshot: idle.midSnapshot,
      endSnapshot: idle.endSnapshot
    }
  };
}