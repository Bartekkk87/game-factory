import path from 'node:path';
import { ROOT } from '../config.mjs';
import { runSession } from './harness.mjs';
import { evaluateContract } from './contract.mjs';

const FIXTURES = [
  { name: 'green', dir: path.join(ROOT, 'examples', 'fixtures', 'green'), mustPass: true },
  { name: 'broken', dir: path.join(ROOT, 'examples', 'fixtures', 'broken'), mustPass: false }
];

let ok = true;

for (const fx of FIXTURES) {
  console.log(`\n--- fixture: ${fx.name} ---`);
  const report = await runSession({ root: fx.dir, seconds: 5 });
  const verdict = evaluateContract(report, { minFps: 10 });
  for (const c of verdict.checks) {
    console.log(` ${c.pass ? 'PASS' : 'FAIL'}  ${c.id}${c.detail ? '  (' + c.detail + ')' : ''}`);
  }
  if (verdict.passed !== fx.mustPass) {
    console.error(`fixture ${fx.name}: expected passed=${fx.mustPass}, got ${verdict.passed}`);
    console.error(`diagnostics: title="${report.pageTitle}" httpIssues=${JSON.stringify(report.httpIssues)} pageErrors=${JSON.stringify(report.pageErrors).slice(0, 300)}`);
    ok = false;
  } else {
    console.log(`fixture ${fx.name}: behaved as expected (passed=${verdict.passed})`);
  }
}

if (!ok) {
  console.error('\ntest:verifier FAILED');
  process.exit(1);
}
console.log('\ntest:verifier PASSED - verifier accepts good and rejects bad products');
