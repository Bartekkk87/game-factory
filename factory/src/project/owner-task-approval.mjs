import fs from 'node:fs';
import path from 'node:path';
import { assertSafeId, assertSha256 } from './contracts.mjs';

export const OWNER_TASK_APPROVAL_SCHEMA = 'project-game.owner-task-approval/v1';
const APPROVAL_KEYS = Object.freeze([
  'approvedBy',
  'authorityVersion',
  'projectId',
  'schemaVersion',
  'taskContractSha256',
  'taskId'
]);

function exactObject(value, keys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${field} fields invalid`);
  }
}

function authorityText(value, field) {
  const text = String(value || '').trim();
  if (!text || /[\u0000-\u001f\u007f]/.test(text)) throw new Error(`${field} invalid`);
  return text;
}

export function createOwnerTaskApproval(input = {}) {
  return Object.freeze({
    schemaVersion: OWNER_TASK_APPROVAL_SCHEMA,
    projectId: assertSafeId(input.projectId, 'owner approval projectId'),
    taskId: assertSafeId(input.taskId, 'owner approval taskId'),
    taskContractSha256: assertSha256(input.taskContractSha256, 'owner approval taskContractSha256'),
    approvedBy: authorityText(input.approvedBy, 'owner approval approvedBy'),
    authorityVersion: authorityText(input.authorityVersion, 'owner approval authorityVersion')
  });
}

export function validateOwnerTaskApproval(raw, expected = {}) {
  exactObject(raw, APPROVAL_KEYS, 'owner task approval');
  if (raw.schemaVersion !== OWNER_TASK_APPROVAL_SCHEMA) throw new Error('owner task approval schema invalid');
  const approval = createOwnerTaskApproval(raw);
  if (expected.projectId && approval.projectId !== assertSafeId(expected.projectId, 'expected approval projectId')) {
    throw new Error('owner task approval project mismatch');
  }
  if (expected.taskId && approval.taskId !== assertSafeId(expected.taskId, 'expected approval taskId')) {
    throw new Error('owner task approval task mismatch');
  }
  if (expected.taskContractSha256
    && approval.taskContractSha256 !== assertSha256(expected.taskContractSha256, 'expected approval taskContractSha256')) {
    throw new Error('owner task approval contract mismatch');
  }
  return approval;
}

export function ownerTaskApprovalPath(projectRoot, taskId) {
  const safeTaskId = assertSafeId(taskId, 'owner approval taskId');
  return path.join(path.resolve(projectRoot), '.factory', 'approvals', `${safeTaskId}.json`);
}

export function loadOwnerTaskApproval(projectRoot, expected = {}) {
  const file = ownerTaskApprovalPath(projectRoot, expected.taskId);
  if (!fs.existsSync(file)) throw new Error(`Owner approval record missing: ${expected.taskId}`);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Owner approval record unreadable: ${error.message}`);
  }
  return validateOwnerTaskApproval(raw, expected);
}
