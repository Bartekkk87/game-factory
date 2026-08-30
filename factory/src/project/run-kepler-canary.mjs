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
const runId = String(process.env.GITHUB_RUN_ID || 'local-kepler-canary');
const maxTokens = Number(process.env.GF_PROJECT_ENGINEER_MAX_TOKENS || 32768);
const route = resolveRoleRoute({
  role: 'engineer',
  operation: 'project-task',
  requirements: { jsonObject: true, maxOutputTokens: maxTokens }
});
assert.equal(route.provider.id, 'openrouter', 'Kepler M1 must use the approved free OpenRouter route');
assert.equal(route.model.id, 'nvidia/nemotron-3.5-lightning:free');
assert.equal(route.model.capabilities.freeEndpoint, true, 'Kepler M1 model must be a registered free endpoint');
assert.equal(Number(route.model.pricing.inputUsdPerM), 0);
assert.equal(Number(route.model.pricing.outputUsdPerM), 0);

beginRunBudget({
  runId: `kepler-project-canary-${runId}`,
  budgetUsd: 0.01,
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

assert.equal(result.status, 'pr-open');
assert.equal(result.binding.taskContractSha256, TASK_SHA256);
const cost = costReport();
assert.equal(cost.pass, true, JSON.stringify(cost.violations));
assert.equal(cost.accountingComplete, true);
assert.equal(cost.costUsd, 0, 'Kepler M1 free endpoint must settle at zero USD');

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
  costUsd: cost.costUsd,
  tokens: cost.tokens
})}`);
