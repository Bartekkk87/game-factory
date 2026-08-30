import { assertSha256, validateTaskContract } from './contracts.mjs';

const PR_BINDING_SCHEMA = 'project-game.task-pr-binding/v1';
const GIT_COMMIT_SHA = /^[0-9a-f]{40}$/;

export function assertGitCommitSha(value, field) {
  const text = String(value || '').trim().toLowerCase();
  if (!GIT_COMMIT_SHA.test(text)) throw new Error(`${field} must be a Git commit SHA`);
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

export function createTaskPrBinding({ task, promotion, baseHeadSha, headSha } = {}) {
  const checkedTask = validateTaskContract(task);
  const baseline = checkedPromotion(checkedTask, promotion);
  const binding = Object.freeze({
    schemaVersion: PR_BINDING_SCHEMA,
    taskId: checkedTask.taskId,
    taskContractSha256: checkedTask.contractSha256,
    baselineTreeSha256: baseline.treeSha256,
    evidenceSha256: baseline.evidenceSha256,
    baseHeadSha: assertGitCommitSha(baseHeadSha, 'task PR binding baseHeadSha'),
    headSha: assertGitCommitSha(headSha, 'task PR binding headSha')
  });
  return validateTaskPrBinding(binding, { task: checkedTask, promotion, expectedHeadSha: binding.headSha });
}

export function taskPrBindingBody(binding) {
  return [
    '## Project Game Mode PG-A0 binding',
    '',
    `- Schema: \`${binding.schemaVersion}\``,
    `- Task: \`${binding.taskId}\``,
    `- Task contract SHA-256: \`${binding.taskContractSha256}\``,
    `- Promoted baseline tree SHA-256: \`${binding.baselineTreeSha256}\``,
    `- Verification evidence SHA-256: \`${binding.evidenceSha256}\``,
    `- Git head: \`${binding.headSha}\``,
    `- Base head: \`${binding.baseHeadSha}\``,
    '',
    'This PR is the external Git authority binding for the verified promoted baseline. '
      + 'Changing the PR head invalidates this recorded binding and requires a new PG-A0 execution.'
  ].join('\n');
}

export function validateTaskPrBinding(binding, { task, promotion, expectedHeadSha = null } = {}) {
  const checkedTask = validateTaskContract(task);
  const baseline = checkedPromotion(checkedTask, promotion);
  if (binding?.schemaVersion !== PR_BINDING_SCHEMA) throw new Error('task PR binding schema invalid');
  if (binding.taskId !== checkedTask.taskId) throw new Error('task PR binding task mismatch');
  if (binding.taskContractSha256 !== checkedTask.contractSha256) throw new Error('task PR binding contract mismatch');
  if (binding.baselineTreeSha256 !== baseline.treeSha256) throw new Error('task PR binding baseline mismatch');
  if (binding.evidenceSha256 !== baseline.evidenceSha256) throw new Error('task PR binding evidence mismatch');
  const headSha = assertGitCommitSha(binding.headSha, 'task PR binding headSha');
  assertGitCommitSha(binding.baseHeadSha, 'task PR binding baseHeadSha');
  if (expectedHeadSha && headSha !== assertGitCommitSha(expectedHeadSha, 'expected task PR head')) {
    throw new Error('task PR head moved after binding');
  }
  return binding;
}

export const TASK_PR_BINDING_SCHEMA = PR_BINDING_SCHEMA;
