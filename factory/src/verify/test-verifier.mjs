import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from '../config.mjs';
import { createOwnerContract } from '../contract/owner.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { assemble } from '../publish/assemble.mjs';
import { runSession } from './harness.mjs';
import { evaluateContract } from './contract.mjs';
import { evaluateProductFidelity } from './fidelity.mjs';

const FIXTURES = [
  { name: 'green', dir: path.join(ROOT, 'examples', 'fixtures', 'green'), mustPass: true },
  { name: 'broken', dir: path.join(ROOT, 'examples', 'fixtures', 'broken'), mustPass: false }
];

let ok = true;
let greenReport = null;

for (const fx of FIXTURES) {
  console.log(`\n--- fixture: ${fx.name} ---`);
  const report = await runSession({ root: fx.dir, seconds: 5 });
  const verdict = await evaluateContract(report, { minFps: 10 });
  for (const c of verdict.checks) {
    console.log(` ${c.pass ? 'PASS' : 'FAIL'}  ${c.id}${c.detail ? '  (' + c.detail + ')' : ''}`);
  }
  if (fx.name === 'green') greenReport = report;
  if (verdict.passed !== fx.mustPass) {
    console.error(`fixture ${fx.name}: expected passed=${fx.mustPass}, got ${verdict.passed}`);
    console.error(`diagnostics: title="${report.pageTitle}" httpIssues=${JSON.stringify(report.httpIssues)} pageErrors=${JSON.stringify(report.pageErrors).slice(0, 300)}`);
    ok = false;
  } else {
    console.log(`fixture ${fx.name}: behaved as expected (passed=${verdict.passed})`);
  }
}

async function proveBrokenContractFixture(name, mutate, expectedFailureId) {
  if (!greenReport) {
    ok = false;
    console.error(`${name}: no green baseline report available`);
    return;
  }
  const report = mutate(structuredClone(greenReport));
  const verdict = await evaluateContract(report, { minFps: 10 });
  const intendedFailure = verdict.failures.some((f) => f.id === expectedFailureId);
  if (verdict.passed || !intendedFailure) {
    ok = false;
    console.error(`${name}: expected verifier failure [${expectedFailureId}]`);
  } else {
    console.log(`${name}: correctly rejected for [${expectedFailureId}]`);
  }
}

await proveBrokenContractFixture('broken-seed', (report) => {
  report.seed = null;
  return report;
}, 'deterministic_seed');

await proveBrokenContractFixture('broken-timeline', (report) => {
  report.timeline = report.timeline.filter((entry) => entry.phase !== 'early');
  report.earlySnapshot = null;
  return report;
}, 'telemetry_timeline');

console.log('\n--- owner contract fixture ---');
const ownerIdea = `## Muss-Have\n- A visible boss encounter.\n- Salvage changes gameplay.\n\n## No-Gos\n- No decorative fake upgrades.`;
const ownerA = createOwnerContract({ idea: ownerIdea, source: 'selftest' });
const ownerB = createOwnerContract({ idea: ownerIdea, source: 'selftest' });
const idsCorrect = ownerA.mustHaves.map((r) => r.id).join(',') === 'MH-01,MH-02' && ownerA.noGos.map((r) => r.id).join(',') === 'NG-01';
const immutable = Object.isFrozen(ownerA) && Object.isFrozen(ownerA.mustHaves) && Object.isFrozen(ownerA.mustHaves[0]);
const stable = ownerA.contractSha256 === ownerB.contractSha256;
if (!idsCorrect || !immutable || !stable) {
  ok = false;
  console.error(`owner contract failed: ids=${idsCorrect} immutable=${immutable} stable=${stable}`);
} else {
  console.log(`owner contract: stable IDs + immutable hash ${ownerA.contractSha256.slice(0, 12)} verified`);
}

console.log('\n--- director traceability fixture ---');
const rawTraceGdd = {
  acceptanceCriteria: [
    { id: 'wrong-id', ownerRequirementId: 'MH-01', statement: 'Boss event is observed.' },
    { id: 'wrong-id-2', ownerRequirementId: 'MH-02', statement: 'Upgrade changes a real value.' },
    { id: 'wrong-id-3', ownerRequirementId: 'NG-01', statement: 'Fake upgrade violation is absent.' }
  ],
  probePlan: {
    scoreEvents: ['score changes'],
    requirementProbes: [
      { id: 'wrong', acceptanceId: 'wrong', ownerRequirementId: 'MH-01', kind: 'event', eventType: 'boss_entered' },
      { id: 'wrong2', acceptanceId: 'wrong2', ownerRequirementId: 'MH-02', kind: 'event_value_change', eventType: 'upgrade_applied' },
      { id: 'wrong3', acceptanceId: 'wrong3', ownerRequirementId: 'NG-01', kind: 'event_absent', eventType: 'fake_upgrade_applied' }
    ]
  }
};
try {
  const compiled = compileDirectorTraceability(rawTraceGdd, ownerA);
  const stableIds = compiled.acceptanceCriteria.map((a) => a.id).join(',') === 'AC-MH-01,AC-MH-02,AC-NG-01'
    && compiled.probePlan.requirementProbes.map((p) => p.id).join(',') === 'PR-MH-01,PR-MH-02,PR-NG-01';
  if (!stableIds) {
    ok = false;
    console.error('director traceability failed to normalize stable IDs');
  } else {
    console.log('director traceability: all Owner IDs mapped to stable AC/PR IDs');
  }
} catch (e) {
  ok = false;
  console.error(`director traceability green fixture failed: ${e.message}`);
}
try {
  compileDirectorTraceability({ ...rawTraceGdd, probePlan: { scoreEvents: ['score changes'], requirementProbes: rawTraceGdd.probePlan.requirementProbes.filter((p) => p.ownerRequirementId !== 'MH-02') } }, ownerA);
  ok = false;
  console.error('director traceability broken fixture was incorrectly accepted');
} catch (e) {
  console.log(`director traceability broken fixture: correctly rejected (${e.message})`);
}

for (const name of ['green', 'broken']) {
  console.log(`\n--- fidelity fixture: ${name} ---`);
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples', 'fixtures', 'fidelity', `${name}.json`), 'utf8'));
  const verdict = evaluateProductFidelity(fixture);
  if (name === 'green') {
    if (!verdict.pass) {
      ok = false;
      console.error(`fidelity green fixture unexpectedly failed: ${JSON.stringify(verdict.failures)}`);
    } else {
      console.log('fidelity green fixture: PASS');
    }
  } else {
    const expected = fixture.expectedFailureIds || [];
    const actual = verdict.failures.map((f) => f.requirementId);
    const intended = !verdict.pass && expected.every((id) => actual.includes(id));
    if (!intended) {
      ok = false;
      console.error(`fidelity broken fixture did not fail as intended: expected=${expected.join(',')} actual=${actual.join(',')}`);
    } else {
      console.log(`fidelity broken fixture: correctly rejected (${actual.join(', ')})`);
    }
  }
}

console.log('\n--- assembled runtime fidelity fixture ---');
const runtimeOwner = createOwnerContract({
  idea: '## Must-Have\n- A boss encounter is observable.\n- An upgrade changes a real gameplay value.',
  source: 'selftest-runtime'
});
const runtimeGdd = compileDirectorTraceability({
  acceptanceCriteria: [
    { ownerRequirementId: 'MH-01', statement: 'Boss entry is observed at runtime.' },
    { ownerRequirementId: 'MH-02', statement: 'Upgrade changes a numeric gameplay value.' }
  ],
  probePlan: {
    scoreEvents: ['input-driven test score'],
    requirementProbes: [
      { ownerRequirementId: 'MH-01', kind: 'event', eventType: 'boss_entered' },
      { ownerRequirementId: 'MH-02', kind: 'event_value_change', eventType: 'upgrade_applied' }
    ]
  }
}, runtimeOwner);

async function runRuntimeFidelityCase(name, changedValue, mustPassFidelity) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gf-${name}-`));
  const design = {
    title: `Runtime ${name}`,
    css: '',
    html: '',
    js: `
const game = new GF.Game({ id: 'runtime-${name}', title: 'Runtime ${name}', background: '#111827' });
let evidenceSent = false;
let visualOffset = 0;
const productiveKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
window.addEventListener('keydown', (event) => {
  if (!productiveKeys.has(event.code)) return;
  game.addScore(1);
  visualOffset = (visualOffset + 17) % 120;
});
game.add('play', {
  update() {
    if (!evidenceSent && game.time >= 1.6) {
      evidenceSent = true;
      game.event('boss_entered', { boss: 'fixture' });
      game.event('upgrade_applied', { before: 1, after: ${changedValue} });
      game.event('oversized_probe', { value: 'x'.repeat(10000) });
    }
  },
  draw(ctx) {
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(120 + visualOffset, 140, 600, 260);
    GF.Draw.text(ctx, 'RUNTIME FIDELITY', 480, 270, { size: 36, color: '#ffffff' });
  }
});
game.go('play');
`
  };
  fs.writeFileSync(path.join(dir, 'index.html'), assemble(design));
  const report = await runSession({ root: dir, seconds: 6 });
  const technical = await evaluateContract(report, { minFps: 10, bgColor: '#111827' });
  const fidelity = evaluateProductFidelity({ ownerContract: runtimeOwner, gdd: runtimeGdd, report });
  const events = report.timeline.flatMap((entry) => entry.snapshot?.events || []);
  const oversized = events.find((event) => event.type === 'oversized_probe');
  const payloadBounded = !oversized || JSON.stringify(oversized.data).length <= 2048;
  fs.rmSync(dir, { recursive: true, force: true });
  const behaved = technical.passed && fidelity.pass === mustPassFidelity && payloadBounded;
  if (!behaved) {
    ok = false;
    console.error(`${name}: technical=${technical.passed} fidelity=${fidelity.pass} expectedFidelity=${mustPassFidelity} payloadBounded=${payloadBounded} failures=${JSON.stringify(technical.failures)}`);
  } else {
    console.log(`${name}: technical PASS, fidelity=${fidelity.pass ? 'PASS' : 'FAIL as expected'}, bounded events PASS`);
  }
}

await runRuntimeFidelityCase('runtime-green', 1.5, true);
await runRuntimeFidelityCase('runtime-broken', 1, false);

if (!ok) {
  console.error('\ntest:verifier FAILED');
  process.exit(1);
}
console.log('\ntest:verifier PASSED - verifier accepts good and rejects bad products');
