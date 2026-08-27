import fs from 'node:fs';
import { PATHS } from '../config.mjs';

let cachedEngine = null;

const PROBE_EXTENSION = `
(function () {
  if (!window.GF || !window.GF.Game || window.GF.__probeExtended) return;
  const BaseGame = window.GF.Game;
  class EvidencedGame extends BaseGame {
    constructor(options) {
      super(options);
      this._probeEvents = [];
      this._probeSeq = 0;
      window.__GF__.events = this._probeEvents;
      window.__GF__.getEvents = () => this._probeEvents.map((event) => ({ ...event, data: { ...(event.data || {}) } }));
      window.__GF__.emit = (type, data) => this.event(type, data);
    }
    event(type, data = {}) {
      let safeData = {};
      try {
        const serialized = JSON.stringify(data ?? {});
        safeData = serialized.length <= 2048
          ? JSON.parse(serialized)
          : { truncated: true, preview: serialized.slice(0, 1900) };
      } catch (_) {
        safeData = { value: String(data).slice(0, 1900) };
      }
      const event = {
        seq: ++this._probeSeq,
        type: String(type || 'event').slice(0, 80),
        time: Math.round((this.time || 0) * 1000) / 1000,
        state: this.state,
        score: this.score,
        data: safeData
      };
      if (this._probeEvents.length >= 128) this._probeEvents.shift();
      this._probeEvents.push(event);
      return event;
    }
    addScore(n = 1) {
      const before = this.score;
      super.addScore(n);
      if (this.score !== before) this.event('score_changed', { before, after: this.score, delta: this.score - before });
    }
    go(name) {
      const before = this.state;
      super.go(name);
      this.event('state_changed', { from: before, to: this.state, scene: name });
    }
    gameOver(options) {
      const before = this.state;
      super.gameOver(options);
      if (this.state !== before) this.event('game_over', { from: before, to: this.state });
    }
    win(options) {
      const before = this.state;
      super.win(options);
      if (this.state !== before) this.event('game_won', { from: before, to: this.state });
    }
  }
  window.GF.Game = EvidencedGame;
  window.GF.__probeExtended = true;
})();
`;

export function assemble({ title, css = '', html = '', js = '' }) {
  if (!cachedEngine) cachedEngine = fs.readFileSync(PATHS.engineFile, 'utf8');
  const safeTitle = String(title).replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
html,body{margin:0;height:100%;background:#000;display:grid;place-items:center;overflow:hidden}
canvas{image-rendering:auto}
${css}
</style>
</head>
<body>
${html}
<script>
${cachedEngine}
${PROBE_EXTENSION}
</script>
<script>
${js}
</script>
</body>
</html>
`;
}

export function resetEngineCache() {
  cachedEngine = null;
}
