import { assertSafeId, assertSha256, validateTaskContract } from './contracts.mjs';

const PR_BINDING_SCHEMA = 'project-game.task-pr-binding/v1';
const GIT_COMMIT_SHA = /^[0-9a-f]{40}$/;

export function assertGitCommitSha(value, field) {
  const text = String(value || '').trim().toLowerCase();
  if (!GIT_COMMIT_SHA.test(text)) throw new Error(`${field} must be a Git commit SHA`);
  return text;
}

function checkedRef(value, field) {
  const text = String(value || '').trim();
  if (!text || /[\u0000-\u001f\u007f`]/.test(text)) throw new Error(`${field} invalid`);
  return text;
}

function checkedPromotion(task, promotion) {
  if (promotion?.status !== 'committed' || promotion?.baselinePromoted !== true) {
    throw new Error('task PR requires a committed verified baseline');
  }
  const baseline = promotion?.state?.baseline;
  if (baseline?.taskId !== task.taskId) throw new Error('promoted baseline task mismatch');
  return Object.freeze({
    treeSha256: assertSha256(baseline.treeSha256, 'promoted baseline treeSha256'),
    evidenceSha256: assertSha256(promotion.evidenceSha256, 'promoted evidenceSha256')
  });
}

export function createTaskPrBinding({ task, promotion, baseRef, baseHeadSha, headRef, headSha } = {}) {
  const checkedTask = validateTaskContract(task);
  const baseline = checkedPromotion(checkedTask, promotion);
  const binding = Object.freeze({
    schemaVersion: PR_BINDING_SCHEMA,
    projectId: checkedTask.projectId,
    taskId: checkedTask.taskId,
    taskContractSha256: checkedTask.contractSha256,
    baselineTreeSha256: baseline.treeSha256,
    evidenceSha256: baseline.evidenceSha256,
    baseRef: checkedRef(baseRef, 'task PR binding baseRef'),
    baseHeadSha: assertGitCommitSha(baseHeadSha, 'task PR binding baseHeadSha'),
    headRef: checkedRef(headRef, 'task PR binding headRef'),
    headSha: assertGitCommitSha(headSha, 'task PR binding headSha')
  });
  return validateTaskPrBinding(binding, { task: checkedTask, promotion, expectedHeadSha: binding.headSha });
}

export function taskPrBindingBody(binding) {
  return [
    '## Project Game Mode PG-A0 binding',
    '',
    `- Schema: \`${binding.schemaVersion}\``,
    `- Project: \`${binding.projectId}\``,
    `- Task: \`${binding.taskId}\``,
    `- Task contract SHA-256: \`${binding.taskContractSha256}\``,
    `- Promoted baseline tree SHA-256: \`${binding.baselineTreeSha256}\``,
    `- Verification evidence SHA-256: \`${binding.evidenceSha256}\``,
    `- Head ref: \`${binding.headRef}\``,
    `- Git head: \`${binding.headSha}\``,
    `- Base ref: \`${binding.baseRef}\``,
    `- Base head: \`${binding.baseHeadSha}\``,
    '',
    'This PR is the external Git authority binding for the verified promoted baseline. '
      + 'Changing the PR head invalidates this recorded binding and requires a new PG-A0 execution.'
  ].join('\n');
}

function bodyFields(body) {
  const fields = new Map();
  for (const line of String(body || '').split('\n')) {
    const match = /^- ([^:]+): `([^`]+)`$/.exec(line.trim());
    if (match) fields.set(match[1], match[2]);
  }
  return fields;
}

export function parseTaskPrBindingBody(body) {
  const fields = bodyFields(body);
  const required = [
    'Schema', 'Project', 'Task', 'Task contract SHA-256', 'Promoted baseline tree SHA-256',
    'Verification evidence SHA-256', 'Head ref', 'Git head', 'Base ref', 'Base head'
  ];
  if (required.some((field) => !fields.has(field))) throw new Error('task PR authority record incomplete');
  const binding = Object.freeze({
    schemaVersion: fields.get('Schema'),
    projectId: assertSafeId(fields.get('Project'), 'task PR authority projectId'),
    taskId: assertSafeId(fields.get('Task'), 'task PR authority taskId'),
    taskContractSha256: assertSha256(fields.get('Task contract SHA-256'), 'task PR authority contract'),
    baselineTreeSha256: assertSha256(
      fields.get('Promoted baseline tree SHA-256'),
      'task PR authority baseline'
    ),
    evidenceSha256: assertSha256(fields.get('Verification evidence SHA-256'), 'task PR authority evidence'),
    headRef: checkedRef(fields.get('Head ref'), 'task PR authority headRef'),
    headSha: assertGitCommitSha(fields.get('Git head'), 'task PR authority headSha'),
    baseRef: checkedRef(fields.get('Base ref'), 'task PR authority baseRef'),
    baseHeadSha: assertGitCommitSha(fields.get('Base head'), 'task PR authority baseHeadSha')
  });
  if (binding.schemaVersion !== PR_BINDING_SCHEMA) throw new Error('task PR authority schema invalid');
  return binding;
}

export function validateTaskPrAuthorityRecord(binding, pull) {
  if (binding?.schemaVersion !== PR_BINDING_SCHEMA) throw new Error('task PR authority schema invalid');
  if (assertGitCommitSha(pull?.head?.sha, 'current task PR head') !== binding.headSha) {
    throw new Error('task PR head moved after binding');
  }
  if (assertGitCommitSha(pull?.base?.sha, 'current task PR base head') !== binding.baseHeadSha) {
    throw new Error('task PR base head moved after binding');
  }
  if (checkedRef(pull?.head?.ref, 'current task PR headRef') !== binding.headRef
    || checkedRef(pull?.base?.ref, 'current task PR baseRef') !== binding.baseRef) {
    throw new Error('task PR ref moved after binding');
  }
  return binding;
}

export function validateTaskPrBinding(binding, { task, promotion, expectedHeadSha = null } = {}) {
  const checkedTask = validateTaskContract(task);
  const baseline = checkedPromotion(checkedTask, promotion);
  if (binding?.schemaVersion !== PR_BINDING_SCHEMA) throw new Error('task PR binding schema invalid');
  if (binding.projectId !== checkedTask.projectId) throw new Error('task PR binding project mismatch');
  if (binding.taskId !== checkedTask.taskId) throw new Error('task PR binding task mismatch');
  if (binding.taskContractSha256 !== checkedTask.contractSha256) throw new Error('task PR binding contract mismatch');
  if (binding.baselineTreeSha256 !== baseline.treeSha256) throw new Error('task PR binding baseline mismatch');
  if (binding.evidenceSha256 !== baseline.evidenceSha256) throw new Error('task PR binding evidence mismatch');
  checkedRef(binding.headRef, 'task PR binding headRef');
  checkedRef(binding.baseRef, 'task PR binding baseRef');
  const headSha = assertGitCommitSha(binding.headSha, 'task PR binding headSha');
  assertGitCommitSha(binding.baseHeadSha, 'task PR binding baseHeadSha');
  if (expectedHeadSha && headSha !== assertGitCommitSha(expectedHeadSha, 'expected task PR head')) {
    throw new Error('task PR head moved after binding');
  }
  return binding;
}

export const TASK_PR_BINDING_SCHEMA = PR_BINDING_SCHEMA;
