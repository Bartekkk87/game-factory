import { LIMITS } from '../config.mjs';

export function evaluateContract(report, { minFps = LIMITS.minFps } = {}) {
  const checks = [];
  const add = (id, label, pass, detail = '') => checks.push({ id, label, pass, detail });

  add('probe_present', 'Test-Hook __GF__ vorhanden', report.probeOk);

  const runtimeErrors = [
    ...report.pageErrors.map((e) => 'pageerror: ' + e),
    ...report.consoleErrors.map((e) => 'console: ' + e),
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

  const failures = checks.filter((c) => !c.pass);
  return { passed: failures.length === 0, checks, failures };
}
