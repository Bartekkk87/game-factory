import assert from 'node:assert/strict';
import path from 'node:path';
import { beginRunBudget, costReport } from '../llm/client.mjs';
import { resolveRoleRoute } from '../llm/router.mjs';
import { requestProjectEngineerPatch } from './engineer-requester.mjs';
import { runPgA0Task } from './runner.mjs';

const PROJECT_ID = 'kepler-outpost';
const TASK_ID = 'KEPLER-M1-T1';
const TASK_SHA256 = '8e073b8afd2c7a15cdfb4bddfb7b181be6ba5ca74e843ce60af50f3819a7054d';

function requiredEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for the Kepler Project Canary`);
  return value;
}

const repository = requiredEnv('GITHUB_REPOSITORY');
const token = requiredEnv('GITHUB_TOKEN');
requiredEnv('OPENROUTER_PRODUCTION');
const runId = String(process.env.GITHUB_RUN_ID || 'local-kepler-canary');
const maxTokens = Number(process.env.GF_PROJECT_ENGINEER_MAX_TOKENS || 32768);
const route = resolveRoleRoute({
  role: 'engineer',
  operation: 'project-task',
  requirements: { jsonObject: true, maxOutputTokens: maxTokens }
});
assert.equal(route.provider.id, 'openrouter', 'Kepler M1 must use the approved OpenRouter production route');
assert.equal(route.model.id, 'deepseek/deepseek-chat-v3.1');
assert.ok(Number(route.model.pricing.inputUsdPerM) > 0, 'Kepler M1 model must have registered input pricing');
assert.ok(Number(route.model.pricing.outputUsdPerM) > 0, 'Kepler M1 model must have registered output pricing');

beginRunBudget({
  runId: `kepler-project-canary-${runId}`,
  budgetUsd: 0.05,
  stageBudgets: {
    repair: { maxCalls: 0, maxUsd: 0 },
    polish: { maxCalls: 0, maxUsd: 0 },
    freshRebuild: { maxCalls: 0, maxUsd: 0 }
  }
});

const repoRoot = path.resolve(process.cwd());
const projectRoot = path.join(repoRoot, 'projects', PROJECT_ID);
const result = await runPgA0Task({
  repoRoot,
  projectRoot,
  taskId: TASK_ID,
  baseBranch: 'main',
  repository,
  token,
  push: true,
  requestEngineerPatch: requestProjectEngineerPatch
});

if (result.status !== 'pr-open') {
  const promotion = result.promotion || null;
  console.error(`KEPLER_PROJECT_CANARY_M1_REJECTED=${JSON.stringify({
    schemaVersion: 'project-game.canary-m1-rejection/v1',
    projectId: PROJECT_ID,
    taskId: TASK_ID,
    status: result.status,
    promotion
  })}`);
  throw new Error(`Kepler M1 was not promoted: ${promotion?.reason || 'unknown-reason'}`);
}
assert.equal(result.binding.taskContractSha256, TASK_SHA256);
const cost = costReport();
assert.equal(cost.pass, true, JSON.stringify(cost.violations));
assert.equal(cost.accountingComplete, true);
assert.ok(cost.costUsd >= 0 && cost.costUsd <= 0.05, 'Kepler M1 must remain within the approved five-cent budget');

console.log(`KEPLER_PROJECT_CANARY_M1=${JSON.stringify({
  schemaVersion: 'project-game.canary-m1/v1',
  status: 'PR_OPEN',
  projectId: PROJECT_ID,
  taskId: TASK_ID,
  taskContractSha256: TASK_SHA256,
  contextSelectionSha256: result.contextSelectionSha256,
  baselineTreeSha256: result.binding.baselineTreeSha256,
  evidenceSha256: result.binding.evidenceSha256,
  baseRef: result.binding.baseRef,
  baseHeadSha: result.binding.baseHeadSha,
  headRef: result.binding.headRef,
  headSha: result.binding.headSha,
  pullRequestNumber: result.pullRequest.number,
  pullRequestUrl: result.pullRequest.htmlUrl,
  model: route.model.id,
  provider: route.provider.id,
  budgetUsd: 0.05,
  costUsd: cost.costUsd,
  tokens: cost.tokens
})}`);
