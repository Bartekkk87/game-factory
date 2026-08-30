import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.mjs';

export const CRITICAL_STYLE_FILES = Object.freeze([
  'factory/src/control/budget.mjs',
  'factory/src/control/evidence.mjs',
  'factory/src/control/staged-commit-policy.mjs',
  'factory/src/control/binary-evidence.mjs',
  'factory/src/learning/proposal-capability.mjs',
  'factory/src/learning/privileged-lifecycle.mjs',
  'factory/src/learning/promotion-proof.mjs',
  'factory/src/memory/store.mjs',
  'factory/src/llm/model-registry.mjs',
  'factory/src/llm/client.mjs',
  'factory/src/llm/router.mjs',
  'factory/src/project/contracts.mjs',
  'factory/src/project/patch-contract.mjs',
  'factory/src/project/transaction.mjs',
  'factory/src/project/runner.mjs',
  'factory/src/project/git-task-pr.mjs',
  'factory/src/project/verification-plan.mjs',
  'factory/src/project/verification-runner.mjs',
  'factory/src/project/persistence-contract.mjs',
  'factory/src/project/web-runtime-adapter.mjs',
  'factory/src/evaluation/s5-benchmark-contract.mjs',
  'factory/src/evaluation/s5-benchmark-result.mjs',
  'factory/src/verify/proof-plan.mjs',
  'factory/src/util/skills.mjs',
  'factory/src/publish/sandbox-host.mjs',
  'factory/src/publish/prepare-sandbox-preview.mjs'
]);

export function inspectCriticalStyle(file) {
  const absolute = path.resolve(ROOT, file);
  if (!fs.existsSync(absolute)) return [`missing critical style target: ${file}`];
  const source = fs.readFileSync(absolute, 'utf8');
  const errors = [];
  if (!source.endsWith('\n')) errors.push(`${file}: missing newline at EOF`);
  if (source.includes('\r')) errors.push(`${file}: CRLF/CR line endings are forbidden`);
  const lines = source.split('\n');
  let denseLines = 0;
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (/\t/.test(line)) errors.push(`${file}:${lineNo}: tab character`);
    if (/[ \t]+$/.test(line)) errors.push(`${file}:${lineNo}: trailing whitespace`);
    if (line.length > 500) errors.push(`${file}:${lineNo}: line exceeds 500 chars`);
    const semicolons = (line.match(/;/g) || []).length;
    if (line.length > 180 && semicolons >= 4) denseLines++;
  });
  const nonEmpty = lines.filter((line) => line.trim()).length || 1;
  if (denseLines / nonEmpty > 0.05) {
    errors.push(`${file}: excessive compressed multi-statement lines (${denseLines}/${nonEmpty})`);
  }
  return errors;
}

export function runCriticalStyleGate() {
  const errors = CRITICAL_STYLE_FILES.flatMap(inspectCriticalStyle);
  if (errors.length) throw new Error(`critical style gate failed:\n${errors.join('\n')}`);
  return { pass: true, files: CRITICAL_STYLE_FILES.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const result = runCriticalStyleGate();
  console.log(`critical style gate: PASS (${result.files} files)`);
}
