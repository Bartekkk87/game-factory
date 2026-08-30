import {
  normalizeProjectPath,
  pathMatchesPrefix,
  sha256,
  validateProjectManifest,
  validateTaskContract
} from './contracts.mjs';

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

export function verificationCheckDefinitionSha256(check) {
  const definition = {
    id: check.id,
    level: check.level,
    kind: check.kind,
    acceptanceIds: [...check.acceptanceIds],
    command: check.command,
    invariantRef: check.invariantRef,
    regressionCapabilityIds: [...check.regressionCapabilityIds],
    independent: check.independent
  };
  return sha256(JSON.stringify(definition));
}

export function createVerificationPlan({ manifest, task, projectState = null } = {}) {
  const checkedManifest = validateProjectManifest(manifest);
  const checkedTask = validateTaskContract(task, checkedManifest);
  const priorRegressions = [...(projectState?.regressions || [])].sort((a, b) => a.checkId.localeCompare(b.checkId));
  const priorRegressionIds = priorRegressions.map((item) => item.checkId);
  const scopedPaths = [...checkedTask.scope.add, ...checkedTask.scope.modify, ...checkedTask.scope.delete];
  for (const regression of projectState?.regressions || []) {
    for (const protectedPath of regression.protectedPaths || []) {
      if (scopedPaths.some((file) => pathMatchesPrefix(file, protectedPath) || pathMatchesPrefix(protectedPath, file))) {
        throw new Error(`task scope overlaps inherited regression fixture: ${protectedPath}`);
      }
    }
  }
  const checks = checkedTask.verification.checks.map((check) => ({
    ...check,
    definitionSha256: verificationCheckDefinitionSha256(check)
  }));
  const declaredIds = new Set(checks.map((check) => check.id));
  for (const regression of priorRegressions) {
    if (!declaredIds.has(regression.checkId)) {
      throw new Error(`task omits verified regression requirement: ${regression.checkId}`);
    }
    const declared = checks.find((check) => check.id === regression.checkId);
    if (declared.definitionSha256 !== regression.definitionSha256) {
      throw new Error(`task redefines verified regression requirement: ${regression.checkId}`);
    }
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

function protectedPathForCheck(check) {
  if (check.invariantRef) return check.invariantRef;
  const match = /^node ([A-Za-z0-9._/-]+\.(?:mjs|js))$/.exec(String(check.command || ''));
  return match ? normalizeProjectPath(match[1], `verification check ${check.id}.command target`) : null;
}

export function deriveVerifiedProjectRecords({ task, plan, verification } = {}) {
  if (verification?.pass !== true || verification.planSha256 !== plan?.planSha256) {
    throw new Error('verified project records require a passing matching verification');
  }
  const passedIds = new Set(verification.checks.filter((check) => check.pass).map((check) => check.id));
  const capabilities = task.acceptance.map((criterion) => {
    const mapped = plan.acceptanceCoverage[criterion.id] || [];
    if (!mapped.length || mapped.some((checkId) => !passedIds.has(checkId))) {
      throw new Error(`acceptance is not fully verified: ${criterion.id}`);
    }
    return Object.freeze({
      id: criterion.id,
      taskId: task.taskId,
      statement: criterion.statement,
      acceptanceSha256: sha256(JSON.stringify(criterion))
    });
  });
  const regressions = plan.checks.filter((check) => check.level === 'L5').map((check) => {
    if (!passedIds.has(check.id)) throw new Error(`regression check did not pass: ${check.id}`);
    const protectedPath = protectedPathForCheck(check);
    return Object.freeze({
      checkId: check.id,
      definitionSha256: check.definitionSha256,
      capabilityIds: check.regressionCapabilityIds.length
        ? [...check.regressionCapabilityIds]
        : [...check.acceptanceIds],
      acceptanceIds: [...check.acceptanceIds],
      protectedPaths: protectedPath ? [protectedPath] : []
    });
  });
  return Object.freeze({ capabilities, regressions });
}
