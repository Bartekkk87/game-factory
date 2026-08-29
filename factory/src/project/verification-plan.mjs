import { pathMatchesPrefix, sha256, validateProjectManifest, validateTaskContract } from './contracts.mjs';

export const VERIFICATION_LEVELS = Object.freeze({
  L1: 'syntax-build',
  L2: 'unit',
  L3: 'simulation-invariants',
  L4: 'module-integration',
  L5: 'project-regression',
  L6: 'browser-boot',
  L7: 'gameplay-contract',
  L8: 'playtest',
  L9: 'audit',
  L10: 'owner-acceptance'
});

export function createVerificationPlan({ manifest, task, projectState = null } = {}) {
  const checkedManifest = validateProjectManifest(manifest);
  const checkedTask = validateTaskContract(task, checkedManifest);
  const priorRegressionIds = [...new Set((projectState?.regressions || []).map((item) => item.checkId).filter(Boolean))].sort();
  const scopedPaths = [...checkedTask.scope.add, ...checkedTask.scope.modify, ...checkedTask.scope.delete];
  for (const regression of projectState?.regressions || []) {
    for (const protectedPath of regression.protectedPaths || []) {
      if (scopedPaths.some((file) => pathMatchesPrefix(file, protectedPath) || pathMatchesPrefix(protectedPath, file))) {
        throw new Error(`task scope overlaps inherited regression fixture: ${protectedPath}`);
      }
    }
  }
  const checks = checkedTask.verification.checks.map((check) => ({ ...check }));
  const declaredIds = new Set(checks.map((check) => check.id));
  for (const checkId of priorRegressionIds) {
    if (!declaredIds.has(checkId)) throw new Error(`task omits verified regression requirement: ${checkId}`);
  }
  const acceptanceCoverage = Object.fromEntries(checkedTask.acceptance.map((criterion) => [
    criterion.id,
    checks.filter((check) => check.acceptanceIds.includes(criterion.id)).map((check) => check.id).sort()
  ]));
  const plan = {
    schemaVersion: 'project-game.verification-plan/v1',
    projectId: checkedManifest.projectId,
    taskId: checkedTask.taskId,
    taskContractSha256: checkedTask.contractSha256,
    checks,
    acceptanceCoverage,
    inheritedRegressionCheckIds: priorRegressionIds,
    rule: 'all required deterministic checks pass; LLM review cannot replace deterministic checks'
  };
  return Object.freeze({ ...plan, planSha256: sha256(JSON.stringify(plan)) });
}

export function evaluateVerificationResults(plan, results = []) {
  if (plan?.schemaVersion !== 'project-game.verification-plan/v1') throw new Error('verification plan schema invalid');
  if (!Array.isArray(results)) throw new Error('verification results must be an array');
  const byId = new Map();
  for (const result of results) {
    if (byId.has(result?.checkId)) throw new Error(`duplicate verification result: ${result?.checkId}`);
    byId.set(result?.checkId, result);
  }
  const checks = plan.checks.map((check) => {
    const result = byId.get(check.id);
    const evidenceSha256 = String(result?.evidenceSha256 || '').toLowerCase();
    const independent = check.independent !== true || result?.producer !== result?.verifier;
    const pass = result?.pass === true && /^[0-9a-f]{64}$/.test(evidenceSha256) && independent;
    return {
      id: check.id,
      level: check.level,
      pass,
      independent,
      evidenceSha256: /^[0-9a-f]{64}$/.test(evidenceSha256) ? evidenceSha256 : null,
      detail: String(result?.detail || (result ? '' : 'missing result')),
      runner: result?.runner || null,
      producer: result?.producer || null,
      verifier: result?.verifier || null
    };
  });
  const failures = checks.filter((check) => !check.pass);
  return Object.freeze({
    schemaVersion: 'project-game.verification-result/v1',
    planSha256: plan.planSha256,
    taskId: plan.taskId,
    pass: checks.length > 0 && failures.length === 0,
    checks,
    failures
  });
}
