import { LIMITS } from '../config.mjs';

async function decodePng(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) throw new Error('no image data');
  const base64 = dataUrl.split(',')[1];
  const buf = Buffer.from(base64, 'base64');
  const { PNG } = await import('pngjs');
  return PNG.sync.read(buf);
}

async function analyzeScreenshot(dataUrl) {
  try {
    const png = await decodePng(dataUrl);
    const bins = new Uint32Array(4096);
    let opaquePixels = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3] <= 128) continue;
      const key = ((png.data[i] >> 4) << 8) | ((png.data[i + 1] >> 4) << 4) | (png.data[i + 2] >> 4);
      bins[key]++;
      opaquePixels++;
    }
    let dominant = 0;
    for (const count of bins) dominant = Math.max(dominant, count);
    const nonDominantRatio = opaquePixels ? (opaquePixels - dominant) / opaquePixels : 0;
    const dominantShare = opaquePixels ? dominant / opaquePixels : 1;
    return {
      visible: nonDominantRatio > 0.02,
      ratio: Math.round(nonDominantRatio * 10000) / 100,
      dominantShare: Math.round(dominantShare * 10000) / 100
    };
  } catch (error) {
    return { visible: false, ratio: 0, dominantShare: 100, error: String(error.message || error) };
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
  } catch (error) {
    return { active: false, ratio: 0, error: String(error.message || error) };
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
    && (idle.consoleErrors || []).filter((error) => !/favicon/i.test(error)).length === 0
    && (idle.requestFailed || []).length === 0
    && (idle.externalRequests || []).length === 0;
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

export async function evaluateContract(report, { minFps = LIMITS.minFps } = {}) {
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
    ...report.pageErrors.map((error) => `pageerror: ${error}`),
    ...report.consoleErrors.filter((error) => !/favicon/i.test(error)).map((error) => `console: ${error}`),
    ...((report.endSnapshot?.errors || []).map((error) => `probe: ${error}`))
  ];
  add('no_runtime_errors', 'Keine Laufzeitfehler', runtimeErrors.length === 0, runtimeErrors.slice(0, 5).join(' | '));

  add('assets_ok', 'Alle Assets geladen', report.requestFailed.length === 0, report.requestFailed.slice(0, 3).join(' | '));

  const externalRequests = Array.isArray(report.externalRequests) ? report.externalRequests : [];
  add(
    'no_external_network',
    'Keine ausgehenden Requests zu Fremd-Origins',
    externalRequests.length === 0,
    externalRequests.slice(0, 3).join(' | ')
  );

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

  const gameplayShots = (report._images || []).filter((shot) => shot.name.startsWith('shot-2') || shot.name.startsWith('shot-3'));
  let visibleCount = 0;
  const details = [];
  for (const shot of gameplayShots) {
    const result = await analyzeScreenshot(shot.dataUrl);
    if (result.visible) visibleCount++;
    details.push(`${shot.name}: ${result.visible ? 'VISIBLE' : 'FLAT'} (${result.ratio}% non-dominant; dominant=${result.dominantShare}%)`);
    if (result.error) details[details.length - 1] += ` [${result.error}]`;
  }
  add(
    'visual_content',
    'Spielinhalt zeigt visuelle Bildvariation statt eines flachen Vollbilds',
    visibleCount >= Math.max(1, gameplayShots.length - 1),
    details.join(' | ')
  );

  const activityShots = (report._images || []).filter((shot) => shot.name.startsWith('activity-'));
  const firstActivity = activityShots.find((shot) => shot.name.startsWith('activity-1'));
  const secondActivity = activityShots.find((shot) => shot.name.startsWith('activity-2'));
  const frameDelta = firstActivity && secondActivity
    ? await analyzeFrameDelta(firstActivity.dataUrl, secondActivity.dataUrl)
    : { active: false, ratio: 0, error: 'two live gameplay activity frames required' };
  add(
    'visual_activity',
    'Gameplay zeigt deterministische Inter-Frame-Aktivität',
    frameDelta.active,
    `${frameDelta.ratio}% pixels changed from live gameplay frames${frameDelta.error ? ` [${frameDelta.error}]` : ''}`
  );

  const failures = checks.filter((check) => !check.pass);
  return { passed: failures.length === 0, checks, failures };
}
