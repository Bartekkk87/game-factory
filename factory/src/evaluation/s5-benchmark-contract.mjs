import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from '../config.mjs';
import { getModelRecord } from '../llm/model-registry.mjs';

export const S5 = Object.freeze({
  config: 'game-factory.s5-system-configuration/v1',
  dataset: 'game-factory.s5-benchmark-dataset/v1',
  oracle: 'game-factory.s5-benchmark-oracle-bundle/v1',
  auth: 'game-factory.s5-benchmark-authorization/v1',
  lane: 'game-factory.s5-benchmark-lane/v1',
  trace: 'game-factory.s5-benchmark-trace/v1',
  result: 'game-factory.s5-benchmark-result/v1'
});

const SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const REASON_KEYS = new Set([
  'chainofthought', 'chain_of_thought', 'hiddenreasoning', 'hidden_reasoning',
  'privatereasoning', 'private_reasoning', 'scratchpad', 'internalmonologue', 'internal_monologue'
]);
const WORKER_ORACLE_KEYS = new Set(['expected', 'expectedoutcome', 'oracle', 'oracleref', 'groundtruth', 'answerkey']);
const REQUIRED_SAMPLING_OPERATIONS = Object.freeze(['build', 'repair', 'rebuild', 'polish']);

const fail = (message) => { throw new Error(`S5 benchmark contract: ${message}`); };
const stringValue = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} is required`);
  return value;
};
const integer = (value, name, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isInteger(value) || value < min || value > max) fail(`${name} must be integer ${min}..${max}`);
  return value;
};
const numberValue = (value, name) => {
  if (!Number.isFinite(value) || value < 0) fail(`${name} must be finite >= 0`);
  return value;
};

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortCanonical(value[key])]));
  }
  return value;
}

export const canonicalJson = (value) => JSON.stringify(sortCanonical(value));
export const canonicalSha256 = (value) => crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');

function ownSha(object, field, label) {
  stringValue(object?.[field], `${label}.${field}`);
  if (!/^[0-9a-f]{64}$/.test(object[field])) fail(`${label}.${field} must be SHA-256`);
  const copy = structuredClone(object);
  delete copy[field];
  const actual = canonicalSha256(copy);
  if (actual !== object[field]) fail(`${label}.${field} mismatch`);
  return actual;
}

function gitBlob(buffer) {
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer])).digest('hex');
}

function safeRepoPath(input, root = ROOT) {
  stringValue(input, 'repo ref path');
  if (path.isAbsolute(input)) fail('repo ref must be relative');
  const normalized = path.normalize(input).replaceAll('\\', '/');
  if (normalized === '..' || normalized.startsWith('../')) fail('repo ref escapes repository');
  const absolute = path.resolve(root, normalized);
  const resolvedRoot = path.resolve(root);
  if (absolute !== resolvedRoot && !absolute.startsWith(`${resolvedRoot}${path.sep}`)) fail('repo ref escapes repository');
  return [normalized, absolute];
}

export function validateRepoRef(ref, { root = ROOT, label = 'repo ref' } = {}) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) fail(`${label} must be object`);
  const [normalized, absolute] = safeRepoPath(ref.path, root);
  stringValue(ref.gitBlobSha, `${label}.gitBlobSha`);
  if (!/^[0-9a-f]{40}$/.test(ref.gitBlobSha)) fail(`${label}.gitBlobSha invalid`);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`${label} missing: ${normalized}`);
  const actual = gitBlob(fs.readFileSync(absolute));
  if (actual !== ref.gitBlobSha) fail(`${label} content hash mismatch: ${normalized}`);
  return { path: normalized, gitBlobSha: actual };
}

function validateRefs(value, root, label) {
  if (!Array.isArray(value) || !value.length) fail(`${label} must be non-empty`);
  return value.map((ref, index) => validateRepoRef(ref, { root, label: `${label}[${index}]` }));
}

export function validateSampling(sampling, modelRecord) {
  if (!sampling || typeof sampling !== 'object' || Array.isArray(sampling)) fail('configuration.sampling required');
  stringValue(sampling.profile, 'configuration.sampling.profile');
  if (sampling.seed !== null && !Number.isInteger(sampling.seed)) fail('configuration.sampling.seed must be integer or null');
  if (!sampling.operations || typeof sampling.operations !== 'object' || Array.isArray(sampling.operations)) {
    fail('configuration.sampling.operations required');
  }
  for (const operation of REQUIRED_SAMPLING_OPERATIONS) {
    const params = sampling.operations[operation];
    if (!params || typeof params !== 'object' || Array.isArray(params)) fail(`configuration.sampling.operations.${operation} required`);
    integer(params.maxOutputTokens, `sampling.${operation}.maxOutputTokens`, 1, 384000);
    if (modelRecord.capabilities.maxOutputTokens && params.maxOutputTokens > modelRecord.capabilities.maxOutputTokens) {
      fail(`sampling.${operation}.maxOutputTokens exceeds model capability`);
    }
    if (typeof params.jsonMode !== 'boolean') fail(`sampling.${operation}.jsonMode must be boolean`);
    if (params.jsonMode && modelRecord.capabilities.jsonObject !== true) fail(`sampling.${operation}.jsonMode unsupported by model`);
    if (modelRecord.requestShape.temperature === 'unsupported') {
      if (params.temperature !== null) fail(`sampling.${operation}.temperature must be null for this model`);
    } else if (!Number.isFinite(params.temperature) || params.temperature < 0 || params.temperature > 2) {
      fail(`sampling.${operation}.temperature must be finite 0..2`);
    }
  }
  return structuredClone(sampling);
}

export function validateSystemConfiguration(configuration, { root = ROOT, evaluatedCommitSha = configuration?.evaluatedCommitSha } = {}) {
  const c = configuration;
  if (!c || typeof c !== 'object' || Array.isArray(c)) fail('configuration must be object');
  if (c.schemaVersion !== S5.config) fail('configuration schema invalid');
  stringValue(c.id, 'configuration.id');
  stringValue(c.version, 'configuration.version');
  if (!VERSION.test(c.version)) fail('configuration.version invalid');
  stringValue(c.evaluatedCommitSha, 'configuration.evaluatedCommitSha');
  if (!SHA.test(c.evaluatedCommitSha)) fail('configuration commit invalid');
  if (evaluatedCommitSha !== c.evaluatedCommitSha) fail('configuration evaluated commit mismatch');
  if (!['model-backed', 'deterministic-fixture'].includes(c.executionClass)) fail('configuration.executionClass invalid');

  if (!c.model) fail('configuration.model required');
  stringValue(c.model.provider, 'configuration.model.provider');
  stringValue(c.model.id, 'configuration.model.id');
  const registryRef = validateRepoRef(c.model.registryRef, { root, label: 'configuration.model.registryRef' });
  const modelRecord = getModelRecord(c.model.provider, c.model.id);
  if (c.model.versionLabel !== modelRecord.versionLabel) fail('configuration model registry mismatch');

  if (!c.promptSkill) fail('configuration.promptSkill required');
  const prompts = validateRefs(c.promptSkill.prompts, root, 'configuration.promptSkill.prompts');
  const skills = validateRefs(c.promptSkill.skills, root, 'configuration.promptSkill.skills');
  if (!c.contextContract) fail('configuration.contextContract required');
  const contextRefs = validateRefs(c.contextContract.refs, root, 'configuration.contextContract.refs');
  stringValue(c.contextContract.visibilityPolicy, 'configuration.contextContract.visibilityPolicy');
  if (!c.verifier) fail('configuration.verifier required');
  const verifierRefs = validateRefs(c.verifier.refs, root, 'configuration.verifier.refs');
  if (!c.retry) fail('configuration.retry required');
  const retryRefs = validateRefs(c.retry.refs, root, 'configuration.retry.refs');
  integer(c.retry.maxAttempts, 'configuration.retry.maxAttempts', 0, 20);
  if (!c.escalation) fail('configuration.escalation required');
  const escalationRefs = validateRefs(c.escalation.refs, root, 'configuration.escalation.refs');
  integer(c.escalation.maxEscalations, 'configuration.escalation.maxEscalations', 0, 10);
  stringValue(c.escalation.authority, 'configuration.escalation.authority');
  const sampling = validateSampling(c.sampling, modelRecord);
  if (!c.trialPlan) fail('configuration.trialPlan required');
  integer(c.trialPlan.trialsPerCase, 'configuration.trialPlan.trialsPerCase', 1, 20);
  stringValue(c.trialPlan.identityPolicy, 'configuration.trialPlan.identityPolicy');
  ownSha(c, 'configurationSha256', 'configuration');

  return {
    ...structuredClone(c),
    resolved: { registryRef, prompts, skills, contextRefs, verifierRefs, retryRefs, escalationRefs, sampling }
  };
}

function assertNoOracle(value, pointer = 'workerPayload') {
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoOracle(item, `${pointer}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (WORKER_ORACLE_KEYS.has(key.toLowerCase())) fail(`${pointer} exposes oracle field ${key}`);
    assertNoOracle(child, `${pointer}.${key}`);
  }
}

export function validateDataset(dataset) {
  const d = dataset;
  if (!d || typeof d !== 'object' || Array.isArray(d)) fail('dataset must be object');
  if (d.schemaVersion !== S5.dataset) fail('dataset schema invalid');
  stringValue(d.datasetId, 'dataset.datasetId');
  stringValue(d.version, 'dataset.version');
  if (!VERSION.test(d.version)) fail('dataset.version invalid');
  if (!['development-regression', 'holdout-generalization'].includes(d.split)) fail('dataset.split invalid');
  if (!Array.isArray(d.cases) || !d.cases.length) fail('dataset.cases empty');
  const ids = new Set();
  d.cases.forEach((entry, index) => {
    stringValue(entry?.id, `dataset.cases[${index}].id`);
    if (ids.has(entry.id)) fail(`duplicate case ${entry.id}`);
    ids.add(entry.id);
    stringValue(entry.familyIdentity, 'case.familyIdentity');
    stringValue(entry.provenanceIdentity, 'case.provenanceIdentity');
    stringValue(entry.sourceFingerprintSha256, 'case.sourceFingerprintSha256');
    if (!/^[0-9a-f]{64}$/.test(entry.sourceFingerprintSha256)) fail('case source fingerprint invalid');
    if (!Object.hasOwn(entry, 'workerPayload')) fail('case workerPayload required');
    assertNoOracle(entry.workerPayload);
    if (canonicalSha256(entry.workerPayload) !== entry.sourceFingerprintSha256) fail(`case ${entry.id} source fingerprint mismatch`);
    stringValue(entry.oracleRef, 'case.oracleRef');
  });
  ownSha(d, 'datasetSha256', 'dataset');
  return structuredClone(d);
}

export function validateDatasetSeparation(development, holdout) {
  validateDataset(development);
  validateDataset(holdout);
  if (development.split !== 'development-regression' || holdout.split !== 'holdout-generalization') fail('dataset split roles invalid');
  for (const [label, key] of [
    ['case id', 'id'], ['source fingerprint', 'sourceFingerprintSha256'],
    ['family identity', 'familyIdentity'], ['provenance identity', 'provenanceIdentity']
  ]) {
    const source = new Set(development.cases.map((entry) => entry[key]));
    const overlap = holdout.cases.map((entry) => entry[key]).filter((value) => source.has(value));
    if (overlap.length) fail(`development/holdout overlap by ${label}: ${[...new Set(overlap)].join(',')}`);
  }
  return true;
}

export function validateOracleBundle(dataset, bundle) {
  validateDataset(dataset);
  if (!bundle || bundle.schemaVersion !== S5.oracle) fail('oracle schema invalid');
  if (bundle.datasetId !== dataset.datasetId || bundle.datasetVersion !== dataset.version || bundle.datasetSha256 !== dataset.datasetSha256) {
    fail('oracle bundle dataset pin mismatch');
  }
  if (!Array.isArray(bundle.oracles) || bundle.oracles.length !== dataset.cases.length) fail('oracle coverage mismatch');
  const ids = new Set();
  for (const oracle of bundle.oracles) {
    stringValue(oracle?.caseId, 'oracle.caseId');
    if (ids.has(oracle.caseId)) fail('duplicate oracle');
    ids.add(oracle.caseId);
    if (!['PASS', 'FAIL'].includes(oracle.expectedOutcome)) fail('oracle expectedOutcome invalid');
    if (typeof oracle.criticalIntegrity !== 'boolean') fail('oracle criticalIntegrity required');
  }
  for (const entry of dataset.cases) if (!ids.has(entry.id)) fail(`oracle missing ${entry.id}`);
  ownSha(bundle, 'oracleSha256', 'oracle');
  return structuredClone(bundle);
}

export function buildWorkerEnvelope({ configuration, dataset, caseId, trialId, root = ROOT }) {
  const c = validateSystemConfiguration(configuration, { root, evaluatedCommitSha: configuration.evaluatedCommitSha });
  validateDataset(dataset);
  const entry = dataset.cases.find((item) => item.id === caseId);
  if (!entry) fail(`unknown case ${caseId}`);
  stringValue(trialId, 'trialId');
  return {
    schemaVersion: 'game-factory.s5-worker-envelope/v1',
    evaluatedCommitSha: c.evaluatedCommitSha,
    configuration: { id: c.id, version: c.version, sha256: c.configurationSha256 },
    dataset: { id: dataset.datasetId, version: dataset.version, sha256: dataset.datasetSha256, split: dataset.split, caseId: entry.id },
    trialId,
    sampling: structuredClone(c.sampling),
    payload: structuredClone(entry.workerPayload)
  };
}

export function assertBenchmarkExecutionAuthorized({ configuration, authorization, lane, root = ROOT }) {
  const c = validateSystemConfiguration(configuration, { root, evaluatedCommitSha: configuration.evaluatedCommitSha });
  if (c.executionClass !== 'model-backed') return { authorized: true, zeroPaid: true };
  if (!authorization || authorization.schemaVersion !== S5.auth || authorization.authorized !== true) fail('model-backed execution lacks separate Owner authorization');
  if (!Array.isArray(authorization.configurationSha256s) || !authorization.configurationSha256s.includes(c.configurationSha256)) {
    fail('authorization does not cover exact configuration SHA');
  }
  numberValue(authorization.maxBudgetUsd, 'authorization.maxBudgetUsd');
  stringValue(authorization.ownerApprovalRef, 'authorization.ownerApprovalRef');
  if (!lane || lane.schemaVersion !== S5.lane || lane.kind !== 'benchmark-isolated') fail('isolated benchmark lane absent');
  numberValue(lane.budgetUsd, 'lane.budgetUsd');
  if (lane.budgetUsd > authorization.maxBudgetUsd) fail('lane budget exceeds authorization');
  if (lane.credentialLane !== 'benchmark' || lane.productionCredentialsAllowed !== false) fail('benchmark credential lane is not isolated');
  return { authorized: true, zeroPaid: false, budgetUsd: lane.budgetUsd };
}

function assertNoHiddenReasoning(value, pointer = 'trace') {
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoHiddenReasoning(item, `${pointer}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (REASON_KEYS.has(key.toLowerCase())) fail(`${pointer} contains forbidden hidden-reasoning field ${key}`);
    assertNoHiddenReasoning(child, `${pointer}.${key}`);
  }
}

function validateTraceRefs(value, name) {
  if (!Array.isArray(value) || !value.length) fail(`${name} must be non-empty`);
  value.forEach((ref, index) => {
    stringValue(ref?.path, `${name}[${index}].path`);
    stringValue(ref?.gitBlobSha, `${name}[${index}].gitBlobSha`);
  });
}

export function validateBenchmarkTrace(trace) {
  const t = trace;
  if (!t || typeof t !== 'object' || Array.isArray(t)) fail('trace must be object');
  if (t.schemaVersion !== S5.trace) fail('trace schema invalid');
  assertNoHiddenReasoning(t);
  stringValue(t.runId, 'trace.runId');
  stringValue(t.trialId, 'trace.trialId');
  stringValue(t.evaluatedCommitSha, 'trace.evaluatedCommitSha');
  if (!SHA.test(t.evaluatedCommitSha)) fail('trace commit invalid');
  stringValue(t.configuration?.id, 'trace.configuration.id');
  stringValue(t.configuration?.version, 'trace.configuration.version');
  stringValue(t.configuration?.sha256, 'trace.configuration.sha256');
  if (!/^[0-9a-f]{64}$/.test(t.configuration.sha256)) fail('trace config SHA invalid');
  stringValue(t.dataset?.id, 'trace.dataset.id');
  stringValue(t.dataset?.version, 'trace.dataset.version');
  stringValue(t.dataset?.sha256, 'trace.dataset.sha256');
  if (!/^[0-9a-f]{64}$/.test(t.dataset.sha256)) fail('trace dataset SHA invalid');
  if (!['development-regression', 'holdout-generalization'].includes(t.dataset.split)) fail('trace split invalid');
  stringValue(t.dataset.caseId, 'trace.dataset.caseId');
  stringValue(t.model?.provider, 'trace.model.provider');
  stringValue(t.model?.id, 'trace.model.id');
  if (!t.sampling || typeof t.sampling !== 'object') fail('trace.sampling required');
  validateTraceRefs(t.promptRefs, 'trace.promptRefs');
  validateTraceRefs(t.skillRefs, 'trace.skillRefs');
  validateTraceRefs(t.contextRefs, 'trace.contextRefs');
  validateTraceRefs(t.verifierRefs, 'trace.verifierRefs');
  if (!t.retry || !Array.isArray(t.retry.actions)) fail('trace.retry.actions required');
  validateTraceRefs(t.retry.refs, 'trace.retry.refs');
  integer(t.retry.count, 'trace.retry.count', 0, 20);
  if (!t.escalation || !Array.isArray(t.escalation.actions)) fail('trace.escalation.actions required');
  validateTraceRefs(t.escalation.refs, 'trace.escalation.refs');
  stringValue(t.escalation.decision, 'trace.escalation.decision');
  if (!Array.isArray(t.toolEvents)) fail('trace.toolEvents required');
  if (!t.evaluator || !['PASS', 'FAIL'].includes(t.evaluator.outcome)) fail('trace evaluator outcome required');
  if (typeof t.evaluator.criticalFalsePass !== 'boolean') fail('trace criticalFalsePass must be explicit');
  stringValue(t.evaluator.sourceRef, 'trace.evaluator.sourceRef');
  if (!Array.isArray(t.evidenceRefs) || !t.evidenceRefs.length) fail('trace evidenceRefs empty');
  t.evidenceRefs.forEach((value, index) => stringValue(value, `trace.evidenceRefs[${index}]`));
  if (t.failureSignature != null) stringValue(t.failureSignature, 'trace.failureSignature');
  if (t.costUsd != null) numberValue(t.costUsd, 'trace.costUsd');
  if (t.latencyMs != null) numberValue(t.latencyMs, 'trace.latencyMs');
  return structuredClone(t);
}
