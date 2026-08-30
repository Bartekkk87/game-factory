import crypto from 'node:crypto';

export const PROJECT_MANIFEST_SCHEMA = 'project-game.manifest/v1';
export const PROJECT_TASK_SCHEMA = 'project-game.task/v1';
export const PROJECT_STATE_SCHEMA = 'project-game.state/v1';
export const PROJECT_EVIDENCE_SCHEMA = 'project-game.task-evidence/v1';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RESERVED_PATHS = Object.freeze([
  'PROJECT.json',
  'ROADMAP.json',
  'ARCHITECTURE.md',
  '.factory/'
]);

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function contractSha(value, omittedKey = 'contractSha256') {
  const copy = structuredClone(value);
  delete copy[omittedKey];
  return sha256(JSON.stringify(copy));
}

export function assertSafeId(value, field) {
  const text = String(value || '').trim();
  if (!SAFE_ID.test(text)) throw new Error(`${field} must be a safe stable identifier`);
  return text;
}

export function normalizeProjectPath(value, field = 'path') {
  const raw = String(value || '').trim().replaceAll('\\', '/');
  const parts = raw.split('/');
  if (!raw || raw.startsWith('/') || parts.includes('..') || parts.includes('.') || raw.includes('\u0000')) {
    throw new Error(`${field} must be a safe project-relative path`);
  }
  return parts.join('/');
}

export function pathMatchesPrefix(file, prefix) {
  const normalizedFile = normalizeProjectPath(file);
  const normalizedPrefix = normalizeProjectPath(prefix).replace(/\/$/, '');
  return normalizedFile === normalizedPrefix || normalizedFile.startsWith(`${normalizedPrefix}/`);
}

export function isReservedProjectPath(file) {
  return RESERVED_PATHS.some((prefix) => pathMatchesPrefix(file, prefix));
}

function stringList(values, field) {
  if (!Array.isArray(values)) throw new Error(`${field} must be an array`);
  return [...new Set(values.map((value) => normalizeProjectPath(value, field)))].sort();
}

function requireText(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${field} is required`);
  return text;
}

function assertExactKeys(value, expected, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const allowed = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(allowed)) {
    throw new Error(`${field} fields invalid`);
  }
}

function assertManifestShape(manifest) {
  assertExactKeys(manifest, [
    'schemaVersion', 'projectId', 'ownerVision', 'projectContract', 'layout',
    'runtimeAdapter', 'moduleGraph', 'testMap', 'contentSchemas', 'immutable',
    'contractSha256'
  ], 'project manifest');
  assertExactKeys(manifest.ownerVision, ['text', 'sha256'], 'project manifest ownerVision');
  assertExactKeys(manifest.projectContract, ['requirements', 'noGos', 'invariants'], 'project manifest projectContract');
  for (const [index, requirement] of manifest.projectContract.requirements.entries()) {
    assertExactKeys(requirement, ['id', 'statement'], `project manifest requirements[${index}]`);
  }
  assertExactKeys(manifest.layout, [
    'sourceDir', 'buildDir', 'testsDir', 'dataDir', 'assetsDir', 'persistenceDir'
  ], 'project manifest layout');
  assertExactKeys(manifest.runtimeAdapter, ['id', 'contractRef'], 'project manifest runtimeAdapter');
}

function assertTaskShape(task) {
  assertExactKeys(task, [
    'schemaVersion', 'taskId', 'projectId', 'milestoneId', 'title', 'scope',
    'acceptance', 'verification', 'context', 'immutable', 'contractSha256'
  ], 'project task');
  assertExactKeys(task.scope, ['add', 'modify', 'delete', 'protected', 'maxFilesChanged'], 'project task scope');
  for (const [index, acceptance] of task.acceptance.entries()) {
    assertExactKeys(acceptance, ['id', 'statement'], `project task acceptance[${index}]`);
  }
  assertExactKeys(task.verification, ['checks'], 'project task verification');
  for (const [index, check] of task.verification.checks.entries()) {
    assertExactKeys(check, [
      'id', 'level', 'kind', 'acceptanceIds', 'command', 'invariantRef',
      'regressionCapabilityIds', 'independent'
    ], `project task verification.checks[${index}]`);
  }
  assertExactKeys(task.context, [
    'targetFiles', 'dependencyRoots', 'testFiles', 'decisionTags', 'lessonTags',
    'maxFiles', 'maxBytes'
  ], 'project task context');
}

function normalizeAcceptance(items) {
  if (!Array.isArray(items) || !items.length) throw new Error('task acceptance criteria are required');
  const ids = new Set();
  return items.map((item, index) => {
    const id = assertSafeId(item?.id, `acceptance[${index}].id`);
    if (!/^AC-[A-Z0-9._-]+$/.test(id)) throw new Error(`acceptance id must start with AC-: ${id}`);
    if (ids.has(id)) throw new Error(`duplicate acceptance id: ${id}`);
    ids.add(id);
    return Object.freeze({
      id,
      statement: requireText(item?.statement, `acceptance ${id}.statement`)
    });
  });
}

function normalizeCheck(check, index, acceptanceIds) {
  const id = assertSafeId(check?.id, `verification.checks[${index}].id`);
  const level = String(check?.level || '').toUpperCase();
  if (!/^L(?:[1-9]|10)$/.test(level)) throw new Error(`verification check ${id} has invalid level`);
  const kind = String(check?.kind || '').trim();
  if (!['command', 'invariant', 'browser', 'playtest', 'audit', 'owner'].includes(kind)) {
    throw new Error(`verification check ${id} has invalid kind`);
  }
  const mapped = [...new Set((check?.acceptanceIds || []).map(String))].sort();
  for (const acceptanceId of mapped) {
    if (!acceptanceIds.has(acceptanceId)) throw new Error(`verification check ${id} maps unknown acceptance ${acceptanceId}`);
  }
  const independent = check?.independent !== false;
  if (['L2', 'L3', 'L4', 'L5', 'L6', 'L7'].includes(level) && !independent) {
    throw new Error(`verification check ${id} must use independent evidence`);
  }
  const command = check?.command ? requireText(check.command, `verification check ${id}.command`) : null;
  const invariantRef = check?.invariantRef
    ? normalizeProjectPath(check.invariantRef, `verification check ${id}.invariantRef`)
    : null;
  if (kind === 'command' && !command) throw new Error(`verification check ${id} requires command`);
  if (kind === 'invariant' && !invariantRef) throw new Error(`verification check ${id} requires invariantRef`);
  return Object.freeze({
    id,
    level,
    kind,
    acceptanceIds: mapped,
    command,
    invariantRef,
    regressionCapabilityIds: [...new Set((check?.regressionCapabilityIds || []).map((value, capabilityIndex) => (
      assertSafeId(value, `verification check ${id}.regressionCapabilityIds[${capabilityIndex}]`)
    )))].sort(),
    independent
  });
}

export function createProjectManifest(input = {}) {
  const projectId = assertSafeId(input.projectId, 'projectId');
  const ownerVision = requireText(input.ownerVision, 'ownerVision');
  const requirements = (input.requirements || []).map((item, index) => Object.freeze({
    id: assertSafeId(item?.id, `requirements[${index}].id`),
    statement: requireText(item?.statement, `requirements[${index}].statement`)
  }));
  if (!requirements.length) throw new Error('project requirements are required');
  const sourceDir = normalizeProjectPath(input.sourceDir || 'src', 'sourceDir');
  const buildDir = normalizeProjectPath(input.buildDir || 'build', 'buildDir');
  if (pathMatchesPrefix(sourceDir, buildDir) || pathMatchesPrefix(buildDir, sourceDir)) {
    throw new Error('editable source and build output must be separate paths');
  }
  const manifest = {
    schemaVersion: PROJECT_MANIFEST_SCHEMA,
    projectId,
    ownerVision: { text: ownerVision, sha256: sha256(ownerVision) },
    projectContract: {
      requirements,
      noGos: [...new Set((input.noGos || []).map((value) => requireText(value, 'project no-go')))],
      invariants: [...new Set((input.invariants || []).map((value) => requireText(value, 'project invariant')))]
    },
    layout: {
      sourceDir,
      buildDir,
      testsDir: normalizeProjectPath(input.testsDir || 'tests', 'testsDir'),
      dataDir: normalizeProjectPath(input.dataDir || 'data', 'dataDir'),
      assetsDir: normalizeProjectPath(input.assetsDir || 'assets', 'assetsDir'),
      persistenceDir: normalizeProjectPath(input.persistenceDir || 'persistence', 'persistenceDir')
    },
    runtimeAdapter: {
      id: requireText(input.runtimeAdapter?.id || 'web-v0.1', 'runtimeAdapter.id'),
      contractRef: normalizeProjectPath(input.runtimeAdapter?.contractRef || 'persistence/web-runtime.json', 'runtimeAdapter.contractRef')
    },
    moduleGraph: structuredClone(input.moduleGraph || {}),
    testMap: structuredClone(input.testMap || {}),
    contentSchemas: [...new Set((input.contentSchemas || []).map((value) => normalizeProjectPath(value, 'contentSchemas')))].sort(),
    immutable: true
  };
  return Object.freeze({ ...manifest, contractSha256: contractSha(manifest) });
}

export function validateProjectManifest(manifest) {
  if (manifest?.schemaVersion !== PROJECT_MANIFEST_SCHEMA) throw new Error('project manifest schema invalid');
  assertManifestShape(manifest);
  const rebuilt = createProjectManifest({
    projectId: manifest.projectId,
    ownerVision: manifest.ownerVision?.text,
    requirements: manifest.projectContract?.requirements,
    noGos: manifest.projectContract?.noGos,
    invariants: manifest.projectContract?.invariants,
    ...manifest.layout,
    runtimeAdapter: manifest.runtimeAdapter,
    moduleGraph: manifest.moduleGraph,
    testMap: manifest.testMap,
    contentSchemas: manifest.contentSchemas
  });
  if (manifest.immutable !== true || rebuilt.contractSha256 !== manifest.contractSha256) {
    throw new Error('project manifest contract hash mismatch');
  }
  return rebuilt;
}

export function createTaskContract(input = {}) {
  const acceptance = normalizeAcceptance(input.acceptance);
  const acceptanceIds = new Set(acceptance.map((item) => item.id));
  const checks = (input.verification?.checks || []).map((check, index) => normalizeCheck(check, index, acceptanceIds));
  for (const requiredLevel of ['L2', 'L4', 'L5']) {
    if (!checks.some((check) => check.level === requiredLevel)) {
      throw new Error(`task verification requires ${requiredLevel}`);
    }
  }
  for (const acceptanceId of acceptanceIds) {
    if (!checks.some((check) => check.acceptanceIds.includes(acceptanceId))) {
      throw new Error(`acceptance ${acceptanceId} has no verification mapping`);
    }
  }
  const task = {
    schemaVersion: PROJECT_TASK_SCHEMA,
    taskId: assertSafeId(input.taskId, 'taskId'),
    projectId: assertSafeId(input.projectId, 'projectId'),
    milestoneId: assertSafeId(input.milestoneId, 'milestoneId'),
    title: requireText(input.title, 'task title'),
    scope: {
      add: stringList(input.scope?.add || [], 'scope.add'),
      modify: stringList(input.scope?.modify || [], 'scope.modify'),
      delete: stringList(input.scope?.delete || [], 'scope.delete'),
      protected: stringList(input.scope?.protected || [], 'scope.protected'),
      maxFilesChanged: Number(input.scope?.maxFilesChanged)
    },
    acceptance,
    verification: { checks },
    context: {
      targetFiles: stringList(input.context?.targetFiles || [], 'context.targetFiles'),
      dependencyRoots: stringList(input.context?.dependencyRoots || [], 'context.dependencyRoots'),
      testFiles: stringList(input.context?.testFiles || [], 'context.testFiles'),
      decisionTags: [...new Set((input.context?.decisionTags || []).map(String))].sort(),
      lessonTags: [...new Set((input.context?.lessonTags || []).map(String))].sort(),
      maxFiles: Number(input.context?.maxFiles || 24),
      maxBytes: Number(input.context?.maxBytes || 180000)
    },
    immutable: true
  };
  if (!Number.isInteger(task.scope.maxFilesChanged) || task.scope.maxFilesChanged < 1) {
    throw new Error('scope.maxFilesChanged must be a positive integer');
  }
  if (!Number.isInteger(task.context.maxFiles) || task.context.maxFiles < 1) throw new Error('context.maxFiles must be positive');
  if (!Number.isInteger(task.context.maxBytes) || task.context.maxBytes < 1) throw new Error('context.maxBytes must be positive');
  const allScoped = [...task.scope.add, ...task.scope.modify, ...task.scope.delete];
  if (new Set(allScoped).size !== allScoped.length) throw new Error('a path may appear in only one task operation scope');
  for (const file of allScoped) {
    if (isReservedProjectPath(file)) throw new Error(`task scope cannot include reserved project authority path: ${file}`);
    if (task.scope.protected.some((prefix) => pathMatchesPrefix(file, prefix))) {
      throw new Error(`task scope overlaps protected path: ${file}`);
    }
  }
  return Object.freeze({ ...task, contractSha256: contractSha(task) });
}

export function validateTaskContract(task, manifest = null) {
  if (task?.schemaVersion !== PROJECT_TASK_SCHEMA) throw new Error('project task schema invalid');
  assertTaskShape(task);
  const rebuilt = createTaskContract(task);
  if (task.immutable !== true || rebuilt.contractSha256 !== task.contractSha256) {
    throw new Error('project task contract hash mismatch');
  }
  if (manifest) {
    if (rebuilt.projectId !== manifest.projectId) throw new Error('task targets a different project');
    const scoped = [...rebuilt.scope.add, ...rebuilt.scope.modify, ...rebuilt.scope.delete];
    for (const file of scoped) {
      if (pathMatchesPrefix(file, manifest.layout.buildDir)) {
        throw new Error(`task scope cannot target reproducible build output: ${file}`);
      }
    }
  }
  return rebuilt;
}

export function assertSha256(value, field) {
  const text = String(value || '').trim().toLowerCase();
  if (!SHA256.test(text)) throw new Error(`${field} must be SHA-256`);
  return text;
}

export const PROJECT_RESERVED_PATHS = RESERVED_PATHS;
