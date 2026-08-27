import path from 'node:path';
import { ROOT } from '../config.mjs';
import { runSession } from './harness.mjs';
import { evaluateContract } from './contract.mjs';

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

if (!ok) {
  console.error('\ntest:verifier FAILED');
  process.exit(1);
}
console.log('\ntest:verifier PASSED - verifier accepts good and rejects bad products');
