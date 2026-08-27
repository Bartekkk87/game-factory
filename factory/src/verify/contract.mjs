import { LIMITS } from '../config.mjs';

function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const bigint = parseInt(m, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function colorDist(c1, c2) {
  return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
}

async function decodePng(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) throw new Error('no image data');
  const base64 = dataUrl.split(',')[1];
  const buf = Buffer.from(base64, 'base64');
  const { PNG } = await import('pngjs');
  return PNG.sync.read(buf);
}

async function analyzeScreenshot(dataUrl, bgColor) {
  try {
    const png = await decodePng(dataUrl);
    const bg = hexToRgb(bgColor || '#101010');
    let diff = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
      if (a > 128 && colorDist({ r, g, b }, bg) > 30) diff++;
    }
    const ratio = diff / (png.width * png.height);
    return { visible: ratio > 0.02, ratio: Math.round(ratio * 10000) / 100 };
  } catch (e) {
    return { visible: false, ratio: 0, error: String(e.message || e) };
  }
}

async function analyzeFrameDelta(firstDataUrl, secondDataUrl) {
  try {
    const first = await decodePng(firstDataUrl);
    const second = await decodePng(secondDataUrl);
    if (first.width !== second.width || first.height !== second.height) {
      return { active: false, ratio: 0, error: 'frame dimensions differ' };
    }
    let changed = 0;
    const pixels = first.width * first.height;
    for (let i = 0; i < first.data.length; i += 4) {
      const alphaDiff = Math.abs(first.data[i + 3] - second.data[i + 3]);
      const rgbDiff = Math.abs(first.data[i] - second.data[i])
        + Math.abs(first.data[i + 1] - second.data[i + 1])
        + Math.abs(first.data[i + 2] - second.data[i + 2]);
      if (alphaDiff > 16 || rgbDiff > 30) changed++;
    }
    const ratio = pixels ? changed / pixels : 0;
    return {
      active: ratio >= 0.002,
      ratio: Math.round(ratio * 1000000) / 10000
    };
  } catch (e) {
    return { active: false, ratio: 0, error: String(e.message || e) };
  }
}

function timelineDetail(timeline) {
  return timeline
    .map((entry) => `${entry.phase}:${entry.snapshot?.state ?? 'null'}/${entry.snapshot?.score ?? 'null'}@${entry.atMs}ms`)
    .join(' -> ');
}

function progressObserved(timeline) {
  const snapshots = timeline
    .filter((entry) => ['start', 'early', 'mid', 'end'].includes(entry.phase) && entry.snapshot)
    .map((entry) => entry.snapshot);
  for (let i = 0; i < snapshots.length; i++) {
    for (let j = i + 1; j < snapshots.length; j++) {
      const a = snapshots[i];
      const b = snapshots[j];
      const scoreAdvanced = typeof a.score === 'number' && typeof b.score === 'number' && b.score > a.score;
      const stateAdvanced = a.state === 'playing' && ['gameover', 'won'].includes(b.state);
      if (scoreAdvanced || stateAdvanced) return true;
    }
  }
  return false;
}

function requiredTimelineComplete(timeline) {
  const phases = new Set((timeline || []).filter((entry) => entry?.snapshot).map((entry) => entry.phase));
  return ['start', 'early', 'mid', 'end'].every((phase) => phases.has(phase));
}

function scoreGain(report) {
  const from = report?.earlySnapshot?.score;
  const to = report?.endSnapshot?.score;
  return typeof from === 'number' && typeof to === 'number' ? to - from : null;
}

function eventGain(report) {
  const from = Array.isArray(report?.earlySnapshot?.events) ? report.earlySnapshot.events.length : null;
  const to = Array.isArray(report?.endSnapshot?.events) ? report.endSnapshot.events.length : null;
  return Number.isInteger(from) && Number.isInteger(to) ? to - from : null;
}

function causalityEvidence(active, idle) {
  if (!idle) return { pass: false, detail: 'idle baseline missing' };
  const sameSeed = Number.isInteger(active?.seed) && active.seed === idle.seed;
  const idleClean = idle.probeOk === true
    && requiredTimelineComplete(idle.timeline)
    && (idle.pageErrors || []).length === 0
    && (idle.consoleErrors || []).filter((e) => !/favicon/i.test(e)).length === 0
    && (idle.requestFailed || []).length === 0;
  if (!sameSeed || !idleClean) {
    return {
      pass: false,
      detail: `control invalid: sameSeed=${sameSeed} idleClean=${idleClean}`
    };
  }

  const activeScoreGain = scoreGain(active);
  const idleScoreGain = scoreGain(idle);
  const activeEventGain = eventGain(active);
  const idleEventGain = eventGain(idle);
  const scoreEffect = activeScoreGain !== null && idleScoreGain !== null && activeScoreGain > idleScoreGain;
  const eventEffect = activeEventGain !== null && idleEventGain !== null && activeEventGain > idleEventGain;
  const activeEnd = active?.endSnapshot?.state ?? null;
  const idleEnd = idle?.endSnapshot?.state ?? null;
  const stateEffect = activeEnd !== idleEnd && ['playing', 'gameover', 'won'].includes(activeEnd);
  return {
    pass: scoreEffect || eventEffect || stateEffect,
    detail: `active(score+${activeScoreGain ?? 'n/a'},events+${activeEventGain ?? 'n/a'},end=${activeEnd}) vs idle(score+${idleScoreGain ?? 'n/a'},events+${idleEventGain ?? 'n/a'},end=${idleEnd})`
  };
}

export async function evaluateContract(report, { minFps = LIMITS.minFps, bgColor = '#101010' } = {}) {
  const checks = [];
  const add = (id, label, pass, detail = '') => checks.push({ id, label, pass, detail });

  add('probe_present', 'Test-Hook __GF__ vorhanden', report.probeOk);
  add(
    'deterministic_seed',
    'Deterministischer Verifier-Seed ist vorhanden',
    Number.isInteger(report.seed),
    `seed=${report.seed ?? 'missing'}`
  );

  const timeline = Array.isArray(report.timeline) ? report.timeline : [];
  const timelineComplete = requiredTimelineComplete(timeline);
  add(
    'telemetry_timeline',
    'Telemetry enthält start/early/mid/end',
    timelineComplete,
    timeline.length ? timelineDetail(timeline) : 'timeline missing'
  );

  const idle = report.idleBaseline || null;
  const idleValid = !!idle
    && idle.inputMode === 'idle'
    && idle.seed === report.seed
    && requiredTimelineComplete(idle.timeline || []);
  add(
    'idle_baseline',
    'Deterministische Idle-Control mit gleichem Seed ist vorhanden',
    idleValid,
    idle ? `mode=${idle.inputMode} seed=${idle.seed} timeline=${timelineDetail(idle.timeline || [])}` : 'idle baseline missing'
  );

  const runtimeErrors = [
    ...report.pageErrors.map((e) => 'pageerror: ' + e),
    ...report.consoleErrors.filter((e) => !/favicon/i.test(e)).map((e) => 'console: ' + e),
    ...((report.endSnapshot?.errors || []).map((e) => 'probe: ' + e))
  ];
  add('no_runtime_errors', 'Keine Laufzeitfehler', runtimeErrors.length === 0, runtimeErrors.slice(0, 5).join(' | '));

  add('assets_ok', 'Alle Assets geladen', report.requestFailed.length === 0, report.requestFailed.slice(0, 3).join(' | '));

  const endState = report.endSnapshot?.state ?? null;
  const started = ['playing', 'gameover', 'won'].includes(endState);
  add('started_playing', 'Spiel verlässt den Titelbildschirm', !!started, `endState=${endState}`);

  const interactive = timelineComplete && progressObserved(timeline);
  add(
    'interactivity',
    'Spiel zeigt deterministischen Gameplay-Fortschritt in der Telemetry',
    interactive,
    timeline.length ? timelineDetail(timeline) : 'timeline missing'
  );

  const causal = causalityEvidence(report, idle);
  add(
    'input_causality',
    'Gameplay-Fortschritt ist gegenüber der Idle-Control auf Eingaben zurückführbar',
    causal.pass,
    causal.detail
  );

  add('fps_ok', `Performance >= ${minFps} FPS`, typeof report.fps === 'number' && report.fps >= minFps, `fps=${report.fps}`);

  const gameplayShots = (report._images || []).filter((s) => s.name.startsWith('shot-2') || s.name.startsWith('shot-3'));
  let visibleCount = 0;
  const details = [];
  for (const shot of gameplayShots) {
    const res = await analyzeScreenshot(shot.dataUrl, bgColor);
    if (res.visible) visibleCount++;
    details.push(`${shot.name}: ${res.visible ? 'VISIBLE' : 'BLACK'} (${res.ratio}% diff)`);
    if (res.error) details[details.length - 1] += ` [${res.error}]`;
  }
  add('visual_content', 'Spielinhalt auf Screenshots sichtbar (nicht schwarz)', visibleCount >= Math.max(1, gameplayShots.length - 1), details.join(' | '));

  const firstGameplay = gameplayShots.find((shot) => shot.name.startsWith('shot-2'));
  const secondGameplay = gameplayShots.find((shot) => shot.name.startsWith('shot-3'));
  const frameDelta = firstGameplay && secondGameplay
    ? await analyzeFrameDelta(firstGameplay.dataUrl, secondGameplay.dataUrl)
    : { active: false, ratio: 0, error: 'two gameplay frames required' };
  add(
    'visual_activity',
    'Gameplay zeigt deterministische Inter-Frame-Aktivität',
    frameDelta.active,
    `${frameDelta.ratio}% pixels changed${frameDelta.error ? ` [${frameDelta.error}]` : ''}`
  );

  const failures = checks.filter((c) => !c.pass);
  return { passed: failures.length === 0, checks, failures };
}
