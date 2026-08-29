import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_STATE_SCHEMA, assertSafeId, assertSha256 } from './contracts.mjs';

const STATE_RELATIVE = '.factory/project-state.json';

function emptyState(projectId) {
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

export function validateProjectState(state, projectId) {
  if (state?.schemaVersion !== PROJECT_STATE_SCHEMA) throw new Error('project state schema invalid');
  if (state.projectId !== projectId) throw new Error('project state belongs to another project');
  for (const field of ['baselineHistory', 'milestones', 'verifiedCapabilities', 'regressions', 'technicalDebt', 'relevantLessons']) {
    if (!Array.isArray(state[field])) throw new Error(`project state ${field} must be an array`);
  }
  if (state.baseline) {
    assertSafeId(state.baseline.id, 'baseline.id');
    assertSha256(state.baseline.treeSha256, 'baseline.treeSha256');
    assertSha256(state.baseline.evidenceSha256, 'baseline.evidenceSha256');
  }
  return structuredClone(state);
}

export function loadProjectState(projectRoot, projectId, { create = true } = {}) {
  const file = path.join(path.resolve(projectRoot), STATE_RELATIVE);
  if (!fs.existsSync(file)) {
    if (!create) throw new Error(`project state missing: ${file}`);
    return emptyState(projectId);
  }
  return validateProjectState(JSON.parse(fs.readFileSync(file, 'utf8')), projectId);
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

export function nextVerifiedState(current, { task, patchEvidence, evidenceSha256, verifiedAt, gitCommitSha = null, capabilities = [], regressions = [], saveSchemaVersion = null, buildVersion = null }) {
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
      ...capabilities
    ].map((item) => [item.id, item])).values()],
    regressions: [...new Map([
      ...current.regressions,
      ...regressions
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
