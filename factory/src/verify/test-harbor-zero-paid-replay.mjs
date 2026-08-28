import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSession } from './harness.mjs';
import { evaluateContract } from './contract.mjs';
import { evaluateProductFidelity } from './fidelity.mjs';
import { compileProofPlan } from './proof-plan.mjs';
import { canonicalVerifierState } from './state-semantics.mjs';

const root = process.cwd();
const frozenRun = path.join(root, 'runs', '20260828-043617');
const frozenAttempt = path.join(frozenRun, 'attempt-05');
const frozenBriefPath = path.join(root, 'ideas', 'harbor-courier-owner-brief-canary-3-2026-08-28.md');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const ownerContract = readJson(path.join(frozenRun, 'owner-contract.json'));
const historicalGdd = readJson(path.join(frozenRun, 'gdd.json'));
const historicalRunEvidence = readJson(path.join(frozenRun, 'RUN-EVIDENCE.json'));
const historicalFidelity = readJson(path.join(frozenAttempt, 'evidence-fidelity.json'));
const frozenBrief = fs.readFileSync(frozenBriefPath, 'utf8');
const frozenHtml = fs.readFileSync(path.join(frozenAttempt, 'index.html'));
const frozenDesign = readJson(path.join(frozenAttempt, 'design.json'));

// Freeze proof: replay the exact Canary #3 brief and exact final candidate bytes.
assert.equal(frozenBrief.trimEnd(), ownerContract.originalBrief.trimEnd(), 'frozen Harbor brief drifted from Canary #3 Owner Contract');
assert.equal(digest(frozenHtml), historicalRunEvidence.run.candidateSha, 'frozen Harbor candidate bytes drifted from Canary #3 durable evidence');
assert.equal(historicalRunEvidence.run.id, '20260828-043617');
assert.equal(historicalRunEvidence.run.status, 'failed');

// Historical baseline: terminal success/failure/restart were the only load-bearing gaps; HUD already passed.
const historicalById = new Map((historicalFidelity.criteria || []).map((criterion) => [criterion.requirementId, criterion]));
assert.equal(historicalById.get('MH-04')?.pass, false);
assert.equal(historicalById.get('MH-06')?.pass, false);
assert.equal(historicalById.get('MH-07')?.pass, false);
assert.equal(historicalById.get('MH-08')?.pass, true);

// Recompile the frozen GDD through the CURRENT proof planner. Do not mutate the frozen source files.
const currentProofPlan = compileProofPlan({ gdd: historicalGdd });
assert.equal(currentProofPlan.pass, true, `current proof plan is unreachable: ${(currentProofPlan.errors || []).join('; ')}`);
assert.deepEqual(new Set(currentProofPlan.requiredTerminalStates), new Set(['success', 'failure']));
assert.ok(currentProofPlan.scenarios.some((scenario) => scenario.id === 'success-proof' && scenario.inputMode === 'active'));
assert.ok(currentProofPlan.scenarios.some((scenario) => scenario.id === 'failure-proof' && scenario.inputMode === 'idle'));
assert.ok(currentProofPlan.scenarios.filter((scenario) => ['success-proof', 'failure-proof'].includes(scenario.id)).every((scenario) => scenario.restartAtEnd === true));

const replayGdd = { ...historicalGdd, proofPlan: currentProofPlan };
const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-harbor-replay-'));
const replayRoot = path.join(tempParent, 'candidate');
fs.cpSync(frozenAttempt, replayRoot, { recursive: true });
fs.writeFileSync(path.join(tempParent, 'gdd.json'), JSON.stringify(replayGdd, null, 2));

let bgColor = '#101010';
const bgMatch = frozenDesign.js?.match(/background\s*:\s*['"`]([^'"`]+)['"`]/);
if (bgMatch) bgColor = bgMatch[1];
else {
  const cssBg = frozenDesign.css?.match(/background\s*:\s*([^;}]+)/);
  if (cssBg) bgColor = cssBg[1].trim();
}

const report = await runSession({
  root: replayRoot,
  seconds: currentProofPlan.baseSeconds,
  screenshotDir: path.join(tempParent, 'shots')
});
const technical = await evaluateContract(report, { bgColor });
const fidelity = evaluateProductFidelity({ ownerContract, gdd: replayGdd, report });

assert.equal(technical.passed, true, `Harbor replay technical verifier failed: ${(technical.checks || []).filter((check) => !check.pass).map((check) => check.id).join(', ')}`);
assert.equal(report.pageErrors.length, 0, `Harbor replay page errors: ${report.pageErrors.join(' | ')}`);
assert.equal(report.consoleErrors.length, 0, `Harbor replay console errors: ${report.consoleErrors.join(' | ')}`);
assert.equal(fidelity.pass, true, `Harbor replay Product Fidelity failed: ${(fidelity.failures || []).map((failure) => failure.requirementId).join(', ')}`);

const byId = new Map((fidelity.criteria || []).map((criterion) => [criterion.requirementId, criterion]));
for (const id of ['MH-04', 'MH-06', 'MH-07', 'MH-08']) {
  assert.equal(byId.get(id)?.pass, true, `${id} did not pass the current verifier replay`);
}
assert.equal(byId.get('MH-04')?.evidenceSource, 'harness-observed');
assert.equal(byId.get('MH-06')?.evidenceSource, 'harness-observed');
assert.equal(byId.get('MH-07')?.evidenceSource, 'harness-observed-terminal-restart');
assert.equal(byId.get('MH-08')?.evidenceSource, 'harness-observed-canvas-geometry');

const scenarioById = new Map((report.proofScenarios || []).map((scenario) => [scenario.id, scenario]));
const success = scenarioById.get('success-proof');
const failure = scenarioById.get('failure-proof');
assert.ok(success, 'success-proof scenario missing from replay');
assert.ok(failure, 'failure-proof scenario missing from replay');
assert.equal(success.canonicalEndState, 'success', `generic harness did not genuinely reach success (raw=${success.endState})`);
assert.equal(failure.canonicalEndState, 'failure', `independent failure proof did not reach failure (raw=${failure.endState})`);
assert.equal(canonicalVerifierState(success.postRestartState), 'playing', `success restart was not observable (raw=${success.postRestartState})`);
assert.equal(canonicalVerifierState(failure.postRestartState), 'playing', `failure restart was not observable (raw=${failure.postRestartState})`);

const summary = {
  replay: 'Harbor Courier Canary #3 frozen candidate',
  sourceRun: historicalRunEvidence.run.id,
  candidateSha: historicalRunEvidence.run.candidateSha,
  costUsd: 0,
  apiCalls: 0,
  technicalPass: technical.passed,
  productFidelityPass: fidelity.pass,
  success: { raw: success.endState, canonical: success.canonicalEndState, postRestart: success.postRestartState },
  failure: { raw: failure.endState, canonical: failure.canonicalEndState, postRestart: failure.postRestartState },
  requiredClaims: Object.fromEntries(['MH-04', 'MH-06', 'MH-07', 'MH-08'].map((id) => [id, { pass: byId.get(id)?.pass, evidenceSource: byId.get(id)?.evidenceSource }]))
};

console.log(JSON.stringify(summary, null, 2));
console.log('HARBOR ZERO-PAID REPLAY PASS: frozen Canary #3 candidate reaches independent failure + success paths, restart is observable after both terminal states, HUD geometry passes, and no API/LLM call is used.');
