import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { evaluateContract } from './contract.mjs';

function pngDataUrl({ flat = false, variant = 0 } = {}) {
  const png = new PNG({ width: 40, height: 40 });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const index = (y * png.width + x) * 4;
      const active = !flat && x > 8 + variant && x < 31 + variant && y > 8 && y < 31;
      png.data[index] = active ? 220 : 255;
      png.data[index + 1] = active ? 20 : 255;
      png.data[index + 2] = active ? 40 : 255;
      png.data[index + 3] = 255;
    }
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

function baseReport(images, externalRequests = []) {
  const start = { state: 'playing', score: 0, events: [] };
  const early = { state: 'playing', score: 1, events: [{ type: 'score_changed' }] };
  const mid = { state: 'playing', score: 2, events: [{ type: 'score_changed' }] };
  const end = { state: 'playing', score: 3, events: [{ type: 'score_changed' }], errors: [] };
  return {
    seed: 1,
    probeOk: true,
    fps: 60,
    pageErrors: [],
    consoleErrors: [],
    requestFailed: [],
    externalRequests,
    startSnapshot: start,
    earlySnapshot: early,
    midSnapshot: mid,
    endSnapshot: end,
    timeline: [
      { phase: 'start', atMs: 0, snapshot: start },
      { phase: 'early', atMs: 1000, snapshot: early },
      { phase: 'mid', atMs: 2000, snapshot: mid },
      { phase: 'end', atMs: 3000, snapshot: end }
    ],
    idleBaseline: {
      seed: 1,
      inputMode: 'idle',
      probeOk: true,
      pageErrors: [],
      consoleErrors: [],
      requestFailed: [],
      externalRequests: [],
      timeline: [
        { phase: 'start', atMs: 0, snapshot: { state: 'playing', score: 0, events: [] } },
        { phase: 'early', atMs: 1000, snapshot: { state: 'playing', score: 0, events: [] } },
        { phase: 'mid', atMs: 2000, snapshot: { state: 'playing', score: 0, events: [] } },
        { phase: 'end', atMs: 3000, snapshot: { state: 'playing', score: 0, events: [] } }
      ],
      earlySnapshot: { score: 0, events: [] },
      endSnapshot: { state: 'playing', score: 0, events: [] }
    },
    _images: images
  };
}

const flat = pngDataUrl({ flat: true });
const varied1 = pngDataUrl({ variant: 0 });
const varied2 = pngDataUrl({ variant: 2 });

const flatVerdict = await evaluateContract(baseReport([
  { name: 'shot-2-gameplay', dataUrl: flat },
  { name: 'shot-3-gameplay', dataUrl: flat },
  { name: 'activity-1-gameplay', dataUrl: varied1 },
  { name: 'activity-2-gameplay', dataUrl: varied2 }
]));
assert.equal(flatVerdict.checks.find((check) => check.id === 'visual_content').pass, false);

const networkVerdict = await evaluateContract(baseReport([
  { name: 'shot-2-gameplay', dataUrl: varied1 },
  { name: 'shot-3-gameplay', dataUrl: varied2 },
  { name: 'activity-1-gameplay', dataUrl: varied1 },
  { name: 'activity-2-gameplay', dataUrl: varied2 }
], ['https://example.invalid/tracker']));
assert.equal(networkVerdict.checks.find((check) => check.id === 'no_external_network').pass, false);

console.log('audit-v2 verifier hardening selftest: PASS');
