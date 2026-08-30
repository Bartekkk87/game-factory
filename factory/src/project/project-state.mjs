import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_STATE_SCHEMA, assertSafeId, assertSha256, normalizeProjectPath } from './contracts.mjs';

const STATE_RELATIVE = '.factory/project-state.json';

export function emptyProjectState(projectId) {
  return {
    schemaVersion: PROJECT_STATE_SCHEMA,
    projectId,
    baseline: null,
    baselineHistory: [],
    milestones: [],
    verifiedCapabilities: [],
    regressions: [],
    technicalDebt: [],
    relevantLessons: [],
    saveSchemaVersion: null,
    buildVersion: null,
    lastSuccessfulRegressionBaseline: null,
    inFlight: null
  };
}

function validateBaseline(baseline, field) {
  assertSafeId(baseline.id, `${field}.id`);
  assertSafeId(baseline.taskId, `${field}.taskId`);
  assertSha256(baseline.treeSha256, `${field}.treeSha256`);
  assertSha256(baseline.evidenceSha256, `${field}.evidenceSha256`);
  if (baseline.gitCommitSha !== null && !/^[0-9a-f]{40}$/.test(String(baseline.gitCommitSha || ''))) {
    throw new Error(`${field}.gitCommitSha must be null or a Git SHA`);
  }
}

function validateRegression(regression, index) {
  assertSafeId(regression?.checkId, `regressions[${index}].checkId`);
  assertSha256(regression?.definitionSha256, `regressions[${index}].definitionSha256`);
  for (const field of ['capabilityIds', 'acceptanceIds', 'protectedPaths']) {
    if (!Array.isArray(regression?.[field])) throw new Error(`regressions[${index}].${field} must be an array`);
  }
  regression.capabilityIds.forEach((id, itemIndex) => assertSafeId(id, `regressions[${index}].capabilityIds[${itemIndex}]`));
  regression.acceptanceIds.forEach((id, itemIndex) => assertSafeId(id, `regressions[${index}].acceptanceIds[${itemIndex}]`));
  regression.protectedPaths.forEach((file, itemIndex) => normalizeProjectPath(file, `regressions[${index}].protectedPaths[${itemIndex}]`));
}

export function validateProjectState(state, projectId) {
  if (state?.schemaVersion !== PROJECT_STATE_SCHEMA) throw new Error('project state schema invalid');
  if (state.projectId !== projectId) throw new Error('project state belongs to another project');
  for (const field of ['baselineHistory', 'milestones', 'verifiedCapabilities', 'regressions', 'technicalDebt', 'relevantLessons']) {
    if (!Array.isArray(state[field])) throw new Error(`project state ${field} must be an array`);
  }
  if (state.baseline) {
    validateBaseline(state.baseline, 'baseline');
  }
  state.baselineHistory.forEach((baseline, index) => validateBaseline(baseline, `baselineHistory[${index}]`));
  state.regressions.forEach(validateRegression);
  return structuredClone(state);
}

export function loadProjectState(projectRoot, projectId, { create = true } = {}) {
  const file = path.join(path.resolve(projectRoot), STATE_RELATIVE);
  if (!fs.existsSync(file)) {
    if (!create) throw new Error(`project state missing: ${file}`);
    return emptyProjectState(projectId);
  }
  return validateProjectState(JSON.parse(fs.readFileSync(file, 'utf8')), projectId);
}

export function initializeProjectState(projectRoot, projectId) {
  const file = path.join(path.resolve(projectRoot), STATE_RELATIVE);
  if (fs.existsSync(file)) throw new Error(`project state already exists: ${file}`);
  return writeProjectStateAtomic(projectRoot, emptyProjectState(projectId));
}

export function writeProjectStateAtomic(projectRoot, state) {
  const root = path.resolve(projectRoot);
  const checked = validateProjectState(state, state.projectId);
  const file = path.join(root, STATE_RELATIVE);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temp, `${JSON.stringify(checked, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
  return checked;
}

export function nextVerifiedState(current, { task, patchEvidence, evidenceSha256, verifiedAt, gitCommitSha = null, verifiedRecords, saveSchemaVersion = null, buildVersion = null }) {
  if (!verifiedRecords || !Array.isArray(verifiedRecords.capabilities) || !Array.isArray(verifiedRecords.regressions)) {
    throw new Error('verified project records are required');
  }
  const baseline = {
    id: `baseline-${task.taskId}`,
    taskId: task.taskId,
    treeSha256: assertSha256(patchEvidence.candidateAfter, 'candidateAfter'),
    evidenceSha256: assertSha256(evidenceSha256, 'evidenceSha256'),
    gitCommitSha: gitCommitSha || null,
    verifiedAt
  };
  return {
    ...current,
    baseline,
    baselineHistory: [...current.baselineHistory, baseline],
    verifiedCapabilities: [...new Map([
      ...current.verifiedCapabilities,
      ...verifiedRecords.capabilities
    ].map((item) => [item.id, item])).values()],
    regressions: [...new Map([
      ...current.regressions,
      ...verifiedRecords.regressions
    ].map((item) => [item.checkId, item])).values()],
    saveSchemaVersion: saveSchemaVersion ?? current.saveSchemaVersion,
    buildVersion: buildVersion ?? current.buildVersion,
    lastSuccessfulRegressionBaseline: baseline.id,
    inFlight: null
  };
}

export function projectStatePath(projectRoot) {
  return path.join(path.resolve(projectRoot), STATE_RELATIVE);
}
