import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOwnerContract } from '../contract/owner.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { assemble } from '../publish/assemble.mjs';
import { runSession } from './harness.mjs';
import { evaluateProductFidelity } from './fidelity.mjs';

const ownerContract = createOwnerContract({
  source: 'layout-geometry-selftest',
  idea: [
    '## Must-Have',
    '- Three gameplay HUD regions must remain visible and non-overlapping.',
    '',
    '## No-Gos',
    '- No HUD region may overlap another or leave the canvas.'
  ].join('\n')
});

const gdd = compileDirectorTraceability({
  title: 'Independent HUD Geometry Fixture',
  acceptanceCriteria: [
    { ownerRequirementId: 'MH-01', statement: 'At least three gameplay HUD regions are independently observed without overlap.' },
    { ownerRequirementId: 'NG-01', statement: 'No independently observed HUD region overlaps another or leaves the canvas.' }
  ],
  probePlan: {
    scoreEvents: ['deterministic input increments score'],
    requirementProbes: [
      { ownerRequirementId: 'MH-01', kind: 'event', eventType: 'hud_layout_clear' },
      { ownerRequirementId: 'NG-01', kind: 'event_absent', eventType: 'hud_overlap_detected' }
    ]
  }
}, ownerContract);

for (const probe of gdd.probePlan.requirementProbes) {
  assert.equal(probe.kind, 'layout_no_overlap');
  assert.equal(probe.minRegions, 3);
  assert.equal(probe.requireScoreProgress, true);
  assert.equal('eventType' in probe, false);
}
assert.equal(gdd.probePlan.requirementProbes[0].legacyEventType, 'hud_layout_clear');
assert.equal(gdd.probePlan.requirementProbes[1].legacyEventType, 'hud_overlap_detected');

// A generated game cannot spoof layout evidence by emitting the historical event names.
const spoofedReport = {
  timeline: [
    { phase: 'start', snapshot: { state: 'title', score: 0, time: 0, events: [] } },
    {
      phase: 'early',
      snapshot: {
        state: 'playing',
        score: 2,
        time: 1.2,
        events: [{ seq: 1, type: 'hud_layout_clear', time: 1.1, state: 'playing', score: 2, data: {} }],
        layout: null
      }
    }
  ]
};
const spoofedVerdict = evaluateProductFidelity({ ownerContract, gdd, report: spoofedReport });
assert.equal(spoofedVerdict.pass, false);
assert.deepEqual(spoofedVerdict.failures.map((item) => item.requirementId).sort(), ['MH-01', 'NG-01']);
assert.ok(spoofedVerdict.criteria.every((item) => item.evidenceSource === 'harness-observed-canvas-geometry'));
assert.match(spoofedVerdict.failures[0].detail, /no independent Playwright canvas layout observation/i);

async function runLayoutCase(name, broken, expectedPass) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gf-layout-${name}-`));
  const panels = broken
    ? [[20, 18, 240, 64], [180, 22, 240, 64], [700, 18, 240, 64]]
    : [[20, 18, 240, 64], [360, 18, 240, 64], [700, 18, 240, 64]];
  const labels = ['CORE 100', 'SCORE 000', 'PROGRESS 1/3'];
  const design = {
    title: `Layout ${name}`,
    css: '',
    html: '',
    js: `
const game = new GF.Game({ id: 'layout-${name}', title: 'Layout ${name}', background: '#08111f' });
const productiveKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
window.addEventListener('keydown', (event) => {
  if (productiveKeys.has(event.code)) game.addScore(1);
});
game.add('play', {
  draw(ctx) {
    const panels = ${JSON.stringify(panels)};
    const labels = ${JSON.stringify(labels)};
    ctx.font = '700 22px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < panels.length; i++) {
      const [x, y, w, h] = panels[i];
      ctx.fillStyle = 'rgba(8, 20, 38, 0.92)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#22d3ee';
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labels[i], x + w / 2, y + h / 2);
    }
    ctx.fillStyle = '#f97316';
    ctx.fillRect(430 + (game.score % 30), 250, 100, 100);
  }
});
game.go('play');
// Deliberate spoof attempt: legacy game events must have zero authority over layout fidelity.
game.event('hud_layout_clear', { claimed: true });
`
  };

  fs.writeFileSync(path.join(dir, 'index.html'), assemble(design));
  try {
    const report = await runSession({ root: dir, seconds: 5 });
    const layoutSnapshots = report.timeline.map((entry) => entry.snapshot?.layout).filter(Boolean);
    assert.ok(layoutSnapshots.length >= 3, `${name}: expected layout snapshots`);
    assert.ok(layoutSnapshots.some((layout) => layout.canvas?.logicalIntrinsicMatch === true), `${name}: assembled canvas intrinsic/logical size must match`);
    assert.ok(layoutSnapshots.some((layout) => layout.regions?.length >= 3), `${name}: expected at least three observed HUD regions`);

    const verdict = evaluateProductFidelity({ ownerContract, gdd, report });
    assert.equal(verdict.pass, expectedPass, `${name}: unexpected fidelity verdict ${JSON.stringify(verdict.failures)}`);
    assert.deepEqual(verdict.coverage.canvasGeometryRequirementIds, ['MH-01', 'NG-01']);
    assert.deepEqual(verdict.coverage.generatedGameEventDependentRequirementIds, []);
    if (expectedPass) {
      assert.ok(verdict.criteria.every((criterion) => /independent canvas layout observed/i.test(criterion.detail)));
    } else {
      assert.ok(verdict.failures.some((failure) => /overlap|issueCount/i.test(failure.detail)));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

await runLayoutCase('green', false, true);
await runLayoutCase('overlap', true, false);

console.log('Technical Verifier independent HUD geometry selftest: PASS');
