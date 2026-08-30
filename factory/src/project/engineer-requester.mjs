import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { sha256, validateTaskContract } from './contracts.mjs';

const DEFAULT_MAX_TOKENS = 32768;
const OPERATIONS = new Set(['ADD', 'MODIFY', 'DELETE']);

function maxOutputTokens() {
  const value = Number(process.env.GF_PROJECT_ENGINEER_MAX_TOKENS || DEFAULT_MAX_TOKENS);
  if (!Number.isInteger(value) || value < 1 || value > 65536) {
    throw new Error('GF_PROJECT_ENGINEER_MAX_TOKENS must be an integer between 1 and 65536');
  }
  return value;
}

function exactPathOperation(task, path) {
  if (task.scope.add.includes(path)) return 'ADD';
  if (task.scope.modify.includes(path)) return 'MODIFY';
  if (task.scope.delete.includes(path)) return 'DELETE';
  return null;
}

function selectedFile(context, path) {
  return context.included.find((item) => item.path === path) || null;
}

function normalizeOperation(raw, index, request) {
  const operation = String(raw?.operation || '').toUpperCase();
  const path = String(raw?.path || '').trim().replaceAll('\\', '/');
  if (!OPERATIONS.has(operation)) throw new Error(`Engineer operation ${index} is invalid`);
  const expected = exactPathOperation(request.task, path);
  if (!expected) throw new Error(`Engineer operation ${index} targets path outside exact task scope: ${path}`);
  if (operation !== expected) {
    throw new Error(`Engineer operation ${index} must use ${expected} for ${path}`);
  }
  const before = selectedFile(request.context, path);
  if (operation !== 'ADD' && !before) {
    throw new Error(`Engineer operation ${index} lacks selected before-state evidence: ${path}`);
  }
  if (operation === 'DELETE') {
    return {
      operation,
      path,
      beforeSha256: before.sha256,
      afterSha256: null,
      content: null
    };
  }
  if (typeof raw?.content !== 'string') throw new Error(`Engineer operation ${index} content missing: ${path}`);
  return {
    operation,
    path,
    beforeSha256: operation === 'ADD' ? null : before.sha256,
    afterSha256: sha256(Buffer.from(raw.content)),
    content: raw.content
  };
}

export function normalizeProjectEngineerResponse({ request, payload, modelEvidence } = {}) {
  if (!request?.manifest || !request?.task || !request?.context) {
    throw new Error('Project Engineer request is incomplete');
  }
  const task = validateTaskContract(request.task, request.manifest);
  if (task.taskId !== request.context.taskId || task.contractSha256 !== request.context.taskContractSha256) {
    throw new Error('Project Engineer context identity mismatch');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Array.isArray(payload.operations)) {
    throw new Error('Project Engineer response must contain operations');
  }
  if (!payload.operations.length || payload.operations.length > task.scope.maxFilesChanged) {
    throw new Error('Project Engineer response operation count invalid');
  }
  const operations = payload.operations.map((item, index) => normalizeOperation(item, index, request));
  if (new Set(operations.map((item) => item.path)).size !== operations.length) {
    throw new Error('Project Engineer response contains duplicate paths');
  }
  if (!modelEvidence?.provider || !modelEvidence?.actualModel) {
    throw new Error('Project Engineer model evidence missing');
  }
  return Object.freeze({
    operations,
    modelEvidence: Object.freeze({
      provider: String(modelEvidence.provider),
      actualModel: String(modelEvidence.actualModel),
      operation: 'project-task'
    })
  });
}

function systemPrompt() {
  return [
    'You are the bounded Engineer for Project Game Mode.',
    'Return ONLY strict JSON with this shape: {"operations":[{"operation":"MODIFY","path":"...","content":"..."}]}.',
    'Use only paths and operation kinds explicitly permitted by the immutable task scope.',
    'Tests, Project authority files, approvals, evidence, and files outside task scope are read-only context.',
    'Do not return hashes; the trusted adapter derives hashes from selected evidence and returned content.',
    'Implement the acceptance criteria against the supplied tests. Do not weaken, rewrite, or bypass verification.',
    'Do not use external URLs or assets unless the immutable Project Contract explicitly permits them.',
    'Keep the implementation deterministic, small, and readable.'
  ].join('\n');
}

function userPrompt(request) {
  const selected = request.context.included.map((item) => ({
    path: item.path,
    reason: item.reason,
    sha256: item.sha256,
    content: item.content
  }));
  return [
    '=== IMMUTABLE PROJECT MANIFEST ===',
    JSON.stringify(request.manifest, null, 2),
    '',
    '=== IMMUTABLE DEVELOPMENT TASK ===',
    JSON.stringify(request.task, null, 2),
    '',
    '=== BOUNDED SELECTED CONTEXT ===',
    JSON.stringify({
      schemaVersion: request.context.schemaVersion,
      selectionSha256: request.context.selectionSha256,
      files: selected
    }, null, 2),
    '',
    'Implement the task now. Return strict JSON only.'
  ].join('\n');
}

export async function requestProjectEngineerPatch(request, { chatImpl = chat } = {}) {
  if (typeof chatImpl !== 'function') throw new Error('Project Engineer chat implementation missing');
  const result = await chatImpl({
    role: 'engineer',
    operation: 'project-task',
    system: systemPrompt(),
    user: userPrompt(request),
    json: true,
    temperature: 0.2,
    maxTokens: maxOutputTokens()
  });
  const payload = extractJson(result.text);
  return normalizeProjectEngineerResponse({
    request,
    payload,
    modelEvidence: {
      provider: result.provider,
      actualModel: result.actualModel
    }
  });
}
