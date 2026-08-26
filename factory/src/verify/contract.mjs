import { LIMITS } from '../config.mjs';

function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const bigint = parseInt(m, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function colorDist(c1, c2) {
  return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
}

async function analyzeScreenshot(dataUrl, bgColor) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return { visible: false, ratio: 0, error: 'no data' };
  try {
    const base64 = dataUrl.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    const { PNG } = await import('pngjs');
    const png = PNG.sync.read(buf);
    const bg = hexToRgb(bgColor || '#101010');
    let diff = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      const r = png.data[i], g = png.data[i+1], b = png.data[i+2], a = png.data[i+3];
      if (a > 128 && colorDist({r,g,b}, bg) > 30) diff++;
    }
    const ratio = diff / (png.width * png.height);
    return { visible: ratio > 0.02, ratio: Math.round(ratio * 10000) / 100 };
  } catch (e) {
    return { visible: false, ratio: 0, error: String(e.message || e) };
  }
}

export async function evaluateContract(report, { minFps = LIMITS.minFps, bgColor = '#101010' } = {}) {
  const checks = [];
  const add = (id, label, pass, detail = '') => checks.push({ id, label, pass, detail });

  add('probe_present', 'Test-Hook __GF__ vorhanden', report.probeOk);

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

  const s0 = report.midSnapshot?.score;
  const s1 = report.endSnapshot?.score;
  const stateAdvanced =
    report.midSnapshot?.state === 'playing' &&
    (report.endSnapshot?.state !== 'playing' || (typeof s0 === 'number' && typeof s1 === 'number' && s1 > s0));
  const scoreChanged = typeof s0 === 'number' && typeof s1 === 'number' && s1 > s0;
  add('interactivity', 'Spiel reagiert auf simulierte Eingaben (Score/Zustand ändert sich)', !!(scoreChanged || stateAdvanced), `score ${s0} -> ${s1}, states ${report.midSnapshot?.state}->${endState}`);

  add('fps_ok', `Performance >= ${minFps} FPS`, typeof report.fps === 'number' && report.fps >= minFps, `fps=${report.fps}`);

  // VISUAL SMOKE TEST: analyze gameplay screenshots for non-background pixels
  const gameplayShots = (report._images || []).filter((s) => s.name.startsWith('shot-2') || s.name.startsWith('shot-3'));
  let visibleCount = 0;
  const details = [];
  for (const shot of gameplayShots) {
    const res = await analyzeScreenshot(shot.dataUrl, bgColor);
    if (res.visible) visibleCount++;
    details.push(`${shot.name}: ${res.visible ? 'VISIBLE' : 'BLACK'} (${res.ratio}% diff)`);
    if (res.error) details[details.length-1] += ` [${res.error}]`;
  }
  add('visual_content', 'Spielinhalt auf Screenshots sichtbar (nicht schwarz)', visibleCount >= Math.max(1, gameplayShots.length - 1), details.join(' | '));

  const failures = checks.filter((c) => !c.pass);
  return { passed: failures.length === 0, checks, failures };
}