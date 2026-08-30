import { isDeepStrictEqual } from 'node:util';
import {
  assertSafeId,
  assertSha256,
  contractSha,
  normalizeProjectPath,
  pathMatchesPrefix,
  sha256,
  validateProjectManifest,
  validateTaskContract
} from './contracts.mjs';
import { validateOwnerTaskApproval } from './owner-task-approval.mjs';
import { createPersistenceContract } from './persistence-contract.mjs';
import { emptyProjectState, validateProjectState } from './project-state.mjs';

export const PROJECT_BOOTSTRAP_TASK_ID = 'PROJECT-BOOTSTRAP';
export const PROJECT_BOOTSTRAP_SPEC_SCHEMA = 'project-game.bootstrap-spec/v1';
export const OWNER_PROJECT_BOOTSTRAP_APPROVAL_SCHEMA = 'project-game.owner-bootstrap-approval/v1';
export const PROJECT_BOOTSTRAP_EVIDENCE_SCHEMA = 'project-game.bootstrap-evidence/v1';

const FILE_ROLES = new Set([
  'architecture',
  'initial-task',
  'initial-task-approval',
  'manifest',
  'milestone',
  'persistence-contract',
  'project-state',
  'roadmap',
  'source-slot',
  'verification-fixture'
]);
const GENERATED_PATHS = Object.freeze({
  spec: '.factory/bootstrap/spec.json',
  approval: '.factory/bootstrap/owner-approval.json',
  evidence: '.factory/evidence/PROJECT-BOOTSTRAP/bootstrap.json'
});
const SPEC_KEYS = Object.freeze([
  'bootstrapTaskId',
  'contractSha256',
  'files',
  'immutable',
  'initialMilestoneId',
  'initialTaskId',
  'projectId',
  'schemaVersion',
  'sourceSlots'
]);
const APPROVAL_KEYS = Object.freeze([
  'approvedBy',
  'authorityVersion',
  'bootstrapSpecSha256',
  'bootstrapTaskId',
  'projectId',
  'schemaVersion'
]);

function exactObject(value, keys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error(`${field} fields invalid`);
  }
}

function authorityText(value, field) {
  const text = String(value || '').trim();
  if (!text || /[\u0000-\u001f\u007f]/.test(text)) throw new Error(`${field} invalid`);
  return text;
}

function normalizedBootstrapFile(file, index) {
  exactObject(file, ['path', 'role', 'sha256'], `bootstrap files[${index}]`);
  const relative = normalizeProjectPath(file.path, `bootstrap files[${index}].path`);
  if (Object.values(GENERATED_PATHS).includes(relative)) {
    throw new Error(`bootstrap generated path cannot be supplied by template: ${relative}`);
  }
  const role = String(file.role || '').trim();
  if (!FILE_ROLES.has(role)) throw new Error(`bootstrap file role invalid: ${role}`);
  return Object.freeze({
    path: relative,
    role,
    sha256: assertSha256(file.sha256, `bootstrap files[${index}].sha256`)
  });
}

export function createProjectBootstrapSpec(input = {}) {
  const projectId = assertSafeId(input.projectId, 'bootstrap projectId');
  const bootstrapTaskId = assertSafeId(input.bootstrapTaskId, 'bootstrap taskId');
  if (bootstrapTaskId !== PROJECT_BOOTSTRAP_TASK_ID) {
    throw new Error(`bootstrap taskId must be ${PROJECT_BOOTSTRAP_TASK_ID}`);
  }
  const files = (input.files || []).map(normalizedBootstrapFile)
    .sort((left, right) => left.path.localeCompare(right.path));
  if (!files.length) throw new Error('bootstrap files are required');
  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new Error('bootstrap files contain duplicate paths');
  }
  const sourceSlots = [...new Set((input.sourceSlots || []).map((file) => (
    normalizeProjectPath(file, 'bootstrap source slot')
  )))].sort();
  if (!sourceSlots.length) throw new Error('bootstrap source slots are required');
  const roleSlots = files.filter((file) => file.role === 'source-slot').map((file) => file.path).sort();
  if (!isDeepStrictEqual(sourceSlots, roleSlots)) {
    throw new Error('bootstrap source slots do not match source-slot files');
  }
  const spec = {
    schemaVersion: PROJECT_BOOTSTRAP_SPEC_SCHEMA,
    projectId,
    bootstrapTaskId,
    initialTaskId: assertSafeId(input.initialTaskId, 'bootstrap initialTaskId'),
    initialMilestoneId: assertSafeId(input.initialMilestoneId, 'bootstrap initialMilestoneId'),
    sourceSlots,
    files,
    immutable: true
  };
  return Object.freeze({ ...spec, contractSha256: contractSha(spec) });
}

export function validateProjectBootstrapSpec(raw) {
  exactObject(raw, SPEC_KEYS, 'project bootstrap spec');
  if (raw.schemaVersion !== PROJECT_BOOTSTRAP_SPEC_SCHEMA) {
    throw new Error('project bootstrap spec schema invalid');
  }
  const rebuilt = createProjectBootstrapSpec(raw);
  if (raw.immutable !== true || raw.contractSha256 !== rebuilt.contractSha256) {
    throw new Error('project bootstrap spec contract hash mismatch');
  }
  return rebuilt;
}

export function createOwnerProjectBootstrapApproval(input = {}) {
  return Object.freeze({
    schemaVersion: OWNER_PROJECT_BOOTSTRAP_APPROVAL_SCHEMA,
    projectId: assertSafeId(input.projectId, 'bootstrap approval projectId'),
    bootstrapTaskId: assertSafeId(input.bootstrapTaskId, 'bootstrap approval taskId'),
    bootstrapSpecSha256: assertSha256(
      input.bootstrapSpecSha256,
      'bootstrap approval bootstrapSpecSha256'
    ),
    approvedBy: authorityText(input.approvedBy, 'bootstrap approval approvedBy'),
    authorityVersion: authorityText(input.authorityVersion, 'bootstrap approval authorityVersion')
  });
}

export function validateOwnerProjectBootstrapApproval(raw, spec) {
  exactObject(raw, APPROVAL_KEYS, 'owner project bootstrap approval');
  if (raw.schemaVersion !== OWNER_PROJECT_BOOTSTRAP_APPROVAL_SCHEMA) {
    throw new Error('owner project bootstrap approval schema invalid');
  }
  const approval = createOwnerProjectBootstrapApproval(raw);
  const checkedSpec = validateProjectBootstrapSpec(spec);
  if (approval.projectId !== checkedSpec.projectId
    || approval.bootstrapTaskId !== checkedSpec.bootstrapTaskId
    || approval.bootstrapSpecSha256 !== checkedSpec.contractSha256) {
    throw new Error('owner project bootstrap approval binding mismatch');
  }
  return approval;
}

function onlyFile(files, role) {
  const matches = files.filter((file) => file.role === role);
  if (matches.length !== 1) throw new Error(`bootstrap requires exactly one ${role} file`);
  return matches[0].path;
}

function checkedJson(readFile, relative, field) {
  try {
    return JSON.parse(readFile(relative).toString('utf8'));
  } catch (error) {
    throw new Error(`${field} unreadable: ${error.message}`);
  }
}

function validateRoadmap(roadmap, spec) {
  exactObject(roadmap, ['schemaVersion', 'projectId', 'milestones'], 'bootstrap roadmap');
  if (roadmap.schemaVersion !== 'project-game.roadmap/v1' || roadmap.projectId !== spec.projectId) {
    throw new Error('bootstrap roadmap identity invalid');
  }
  if (!Array.isArray(roadmap.milestones) || roadmap.milestones.length !== 1) {
    throw new Error('bootstrap roadmap must materialize exactly the initial milestone');
  }
  const milestone = roadmap.milestones[0];
  exactObject(milestone, ['id', 'status', 'title'], 'bootstrap roadmap milestone');
  if (milestone.id !== spec.initialMilestoneId || milestone.status !== 'owner-approved') {
    throw new Error('bootstrap roadmap initial milestone invalid');
  }
}

function validatePersistenceRuntime(runtime) {
  exactObject(
    runtime,
    ['entry', 'frameSelector', 'persistence', 'readySelector', 'schemaVersion'],
    'bootstrap persistence runtime'
  );
  if (runtime.schemaVersion !== 'project-game.web-runtime/v1') {
    throw new Error('bootstrap persistence runtime schema invalid');
  }
  for (const field of ['entry', 'frameSelector', 'readySelector']) {
    if (!String(runtime[field] || '').trim()) throw new Error(`bootstrap persistence runtime ${field} missing`);
  }
  const persistence = runtime.persistence;
  if (Object.hasOwn(persistence || {}, 'equivalenceProjection')) {
    throw new Error('bootstrap persistence equivalenceProjection is forbidden');
  }
  const rebuilt = createPersistenceContract({
    schemaVersion: persistence?.saveSchemaVersion,
    slots: persistence?.slots,
    maxBytes: persistence?.maxBytes,
    corruptSaveBehavior: persistence?.corruptSaveBehavior,
    migrations: persistence?.migrations,
    transientStatePaths: persistence?.canonicalDurableState?.transientStatePaths,
    browserReloadProofRequired: persistence?.browserReloadProofRequired
  });
  if (!isDeepStrictEqual(rebuilt, persistence)) {
    throw new Error('bootstrap persistence contract hash or fields invalid');
  }
  return runtime;
}

function commandTarget(command) {
  const match = /^node ([A-Za-z0-9._/-]+\.(?:mjs|js))$/.exec(String(command || ''));
  return match ? normalizeProjectPath(match[1], 'bootstrap verification command') : null;
}

export function validateProjectBootstrapPayload({ spec, approval, readFile, listFiles } = {}) {
  const checkedSpec = validateProjectBootstrapSpec(spec);
  const checkedApproval = validateOwnerProjectBootstrapApproval(approval, checkedSpec);
  if (typeof readFile !== 'function' || typeof listFiles !== 'function') {
    throw new Error('bootstrap payload readers missing');
  }
  const actualFiles = [...listFiles()].sort();
  const expectedFiles = checkedSpec.files.map((file) => file.path).sort();
  if (!isDeepStrictEqual(actualFiles, expectedFiles)) {
    throw new Error('bootstrap template file set does not match exact spec');
  }
  for (const file of checkedSpec.files) {
    if (sha256(readFile(file.path)) !== file.sha256) {
      throw new Error(`bootstrap template file hash mismatch: ${file.path}`);
    }
  }

  const manifestPath = onlyFile(checkedSpec.files, 'manifest');
  if (manifestPath !== 'PROJECT.json') throw new Error('bootstrap manifest path must be PROJECT.json');
  const manifest = validateProjectManifest(checkedJson(readFile, manifestPath, 'bootstrap manifest'));
  if (manifest.projectId !== checkedSpec.projectId) throw new Error('bootstrap manifest project mismatch');

  const roadmapPath = onlyFile(checkedSpec.files, 'roadmap');
  if (roadmapPath !== 'ROADMAP.json') throw new Error('bootstrap roadmap path must be ROADMAP.json');
  validateRoadmap(checkedJson(readFile, roadmapPath, 'bootstrap roadmap'), checkedSpec);

  const architecturePath = onlyFile(checkedSpec.files, 'architecture');
  if (architecturePath !== 'ARCHITECTURE.md' || !readFile(architecturePath).toString('utf8').trim()) {
    throw new Error('bootstrap architecture record invalid');
  }

  const milestonePath = onlyFile(checkedSpec.files, 'milestone');
  if (milestonePath !== `milestones/${checkedSpec.initialMilestoneId}.json`) {
    throw new Error('bootstrap milestone path invalid');
  }
  const milestone = checkedJson(readFile, milestonePath, 'bootstrap milestone');
  exactObject(milestone, ['id', 'title'], 'bootstrap milestone');
  if (milestone.id !== checkedSpec.initialMilestoneId) throw new Error('bootstrap milestone identity invalid');

  const taskPath = onlyFile(checkedSpec.files, 'initial-task');
  if (taskPath !== `.factory/tasks/${checkedSpec.initialTaskId}.json`) {
    throw new Error('bootstrap initial task path invalid');
  }
  const task = validateTaskContract(checkedJson(readFile, taskPath, 'bootstrap initial task'), manifest);
  if (task.taskId !== checkedSpec.initialTaskId || task.milestoneId !== checkedSpec.initialMilestoneId) {
    throw new Error('bootstrap initial task identity invalid');
  }

  const taskApprovalPath = onlyFile(checkedSpec.files, 'initial-task-approval');
  if (taskApprovalPath !== `.factory/approvals/${checkedSpec.initialTaskId}.json`) {
    throw new Error('bootstrap initial task approval path invalid');
  }
  validateOwnerTaskApproval(checkedJson(readFile, taskApprovalPath, 'bootstrap initial task approval'), {
    projectId: checkedSpec.projectId,
    taskId: checkedSpec.initialTaskId,
    taskContractSha256: task.contractSha256
  });

  const statePath = onlyFile(checkedSpec.files, 'project-state');
  if (statePath !== '.factory/project-state.json') throw new Error('bootstrap project state path invalid');
  const state = validateProjectState(checkedJson(readFile, statePath, 'bootstrap project state'), checkedSpec.projectId);
  if (!isDeepStrictEqual(state, emptyProjectState(checkedSpec.projectId))) {
    throw new Error('bootstrap project state must be empty and fail-closed');
  }

  const persistencePath = onlyFile(checkedSpec.files, 'persistence-contract');
  if (persistencePath !== manifest.runtimeAdapter.contractRef) {
    throw new Error('bootstrap persistence contract path does not match manifest');
  }
  validatePersistenceRuntime(checkedJson(readFile, persistencePath, 'bootstrap persistence runtime'));

  if (task.scope.add.length || task.scope.delete.length
    || !isDeepStrictEqual(task.scope.modify, checkedSpec.sourceSlots)
    || !isDeepStrictEqual(task.context.targetFiles, checkedSpec.sourceSlots)
    || task.scope.maxFilesChanged !== checkedSpec.sourceSlots.length) {
    throw new Error('bootstrap initial task scope does not match exact source slots');
  }
  const fixtures = checkedSpec.files
    .filter((file) => file.role === 'verification-fixture')
    .map((file) => file.path)
    .sort();
  if (!fixtures.length || !isDeepStrictEqual(task.context.testFiles, fixtures)) {
    throw new Error('bootstrap verification fixtures do not match initial task context');
  }
  for (const check of task.verification.checks) {
    const target = commandTarget(check.command);
    if (!target || !fixtures.includes(target)) {
      throw new Error(`bootstrap verification check is not a protected fixture: ${check.id}`);
    }
  }
  for (const fixture of [...fixtures, persistencePath]) {
    if (!task.scope.protected.some((prefix) => pathMatchesPrefix(fixture, prefix))) {
      throw new Error(`bootstrap protected scope does not cover authority fixture: ${fixture}`);
    }
  }
  for (const [module, dependencies] of Object.entries(manifest.moduleGraph)) {
    if (!checkedSpec.sourceSlots.includes(module)
      || !Array.isArray(dependencies)
      || dependencies.some((file) => !checkedSpec.sourceSlots.includes(file))) {
      throw new Error('bootstrap manifest module graph exceeds source slots');
    }
  }
  if (!isDeepStrictEqual(Object.keys(manifest.moduleGraph).sort(), checkedSpec.sourceSlots)) {
    throw new Error('bootstrap manifest module graph does not cover exact source slots');
  }
  for (const [module, mapped] of Object.entries(manifest.testMap)) {
    if (!checkedSpec.sourceSlots.includes(module)
      || !Array.isArray(mapped)
      || mapped.some((file) => !fixtures.includes(file))) {
      throw new Error('bootstrap manifest test map exceeds source slots or fixtures');
    }
  }
  return Object.freeze({ spec: checkedSpec, approval: checkedApproval, manifest, task, state });
}

export function createProjectBootstrapEvidence({
  spec,
  approvalText,
  initialTreeSha256,
  files
} = {}) {
  const checkedSpec = validateProjectBootstrapSpec(spec);
  const approvalSha256 = sha256(Buffer.from(String(approvalText || '')));
  const evidenceFiles = (files || []).map((file, index) => {
    exactObject(file, ['path', 'sha256'], `bootstrap evidence files[${index}]`);
    return Object.freeze({
      path: normalizeProjectPath(file.path, `bootstrap evidence files[${index}].path`),
      sha256: assertSha256(file.sha256, `bootstrap evidence files[${index}].sha256`)
    });
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (!evidenceFiles.length || new Set(evidenceFiles.map((file) => file.path)).size !== evidenceFiles.length) {
    throw new Error('bootstrap evidence exact files invalid');
  }
  return Object.freeze({
    schemaVersion: PROJECT_BOOTSTRAP_EVIDENCE_SCHEMA,
    projectId: checkedSpec.projectId,
    taskId: checkedSpec.bootstrapTaskId,
    bootstrapSpecSha256: checkedSpec.contractSha256,
    ownerApprovalSha256: approvalSha256,
    initialTreeSha256: assertSha256(initialTreeSha256, 'bootstrap evidence initialTreeSha256'),
    sourceSlots: [...checkedSpec.sourceSlots],
    files: evidenceFiles,
    operation: 'project-bootstrap',
    engineerCallExecuted: false,
    result: 'PASS'
  });
}

export function projectBootstrapGeneratedPaths() {
  return GENERATED_PATHS;
}
