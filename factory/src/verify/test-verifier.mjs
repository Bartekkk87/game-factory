import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.mjs';
import { createOwnerContract } from '../contract/owner.mjs';
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

if (!ok) {
  console.error('\ntest:verifier FAILED');
  process.exit(1);
}
console.log('\ntest:verifier PASSED - verifier accepts good and rejects bad products');
