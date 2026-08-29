import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.mjs';
import {
  S5,
  canonicalSha256,
  validateSystemConfiguration,
  validateDataset,
  validateDatasetSeparation,
  validateOracleBundle,
  buildWorkerEnvelope,
  assertBenchmarkExecutionAuthorized,
  validateBenchmarkTrace
} from './s5-benchmark-contract.mjs';
import { buildBenchmarkResult, validateAdvisoryBenchmarkResult } from './s5-benchmark-result.mjs';

const read = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const clone = (value) => structuredClone(value);
const seal = (value, field) => {
  delete value[field];
  value[field] = canonicalSha256(value);
  return value;
};
const sealConfig = (value) => seal(value, 'configurationSha256');
const sealDataset = (value) => seal(value, 'datasetSha256');
const sealOracle = (value) => seal(value, 'oracleSha256');

let proved = 0;
function pass(name) {
  proved++;
  console.log(`PASS ${name}`);
}
function expectReject(name, fn) {
  let rejected = false;
  try { fn(); } catch { rejected = true; }
  assert.equal(rejected, true, `${name}: expected fail-closed rejection`);
  pass(name);
}

const reference = read('evaluation/benchmark/configurations/reference-luna-v1.json');
const challenger = read('evaluation/benchmark/configurations/challenger-deepseek-v31.json');
const development = read('evaluation/benchmark/datasets/development-regression-v1.json');
const holdout = read('evaluation/benchmark/datasets/holdout-generalization-v1.json');
const developmentOracle = read('evaluation/benchmark/oracles/development-regression-v1.json');
const holdoutOracle = read('evaluation/benchmark/oracles/holdout-generalization-v1.json');

const referenceValidated = validateSystemConfiguration(reference, { evaluatedCommitSha: reference.evaluatedCommitSha });
const challengerValidated = validateSystemConfiguration(challenger, { evaluatedCommitSha: challenger.evaluatedCommitSha });
validateDataset(development);
validateDataset(holdout);
validateDatasetSeparation(development, holdout);
validateOracleBundle(development, developmentOracle);
validateOracleBundle(holdout, holdoutOracle);
pass('canonical reference/challenger configurations and split datasets validate');

for (const component of ['model', 'promptSkill', 'contextContract', 'verifier', 'retry', 'escalation', 'sampling']) {
  expectReject(`missing required configuration component ${component}`, () => {
    const bad = clone(reference);
    delete bad[component];
    sealConfig(bad);
    validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
  });
}

expectReject('unversioned configuration rejects', () => {
  const bad = clone(reference); delete bad.version; sealConfig(bad);
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});
expectReject('missing configuration SHA rejects', () => {
  const bad = clone(reference); delete bad.configurationSha256;
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});
expectReject('unknown provider/model rejects', () => {
  const bad = clone(reference); bad.model.provider = 'unknown'; bad.model.id = 'unknown'; bad.model.versionLabel = 'unknown'; sealConfig(bad);
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});
expectReject('model registry version mismatch rejects', () => {
  const bad = clone(reference); bad.model.versionLabel = 'wrong-version'; sealConfig(bad);
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});
expectReject('missing repo reference rejects', () => {
  const bad = clone(reference); bad.contextContract.refs[0].path = 'factory/src/contract/does-not-exist.mjs'; sealConfig(bad);
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});
expectReject('repo content hash mismatch rejects', () => {
  const bad = clone(reference); bad.promptSkill.prompts[0].gitBlobSha = '0'.repeat(40); sealConfig(bad);
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});
expectReject('evaluated commit mismatch rejects', () => {
  validateSystemConfiguration(reference, { evaluatedCommitSha: '0'.repeat(40) });
});
expectReject('sampling temperature incompatible with model request contract rejects', () => {
  const bad = clone(reference); bad.sampling.operations.build.temperature = 0.3; sealConfig(bad);
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});

function overlapHoldout(field, value) {
  const bad = clone(holdout);
  bad.cases[0][field] = value;
  if (field === 'workerPayload') bad.cases[0].sourceFingerprintSha256 = canonicalSha256(bad.cases[0].workerPayload);
  sealDataset(bad);
  return bad;
}
expectReject('development/holdout case-id overlap rejects', () => validateDatasetSeparation(development, overlapHoldout('id', development.cases[0].id)));
expectReject('development/holdout source fingerprint overlap rejects', () => validateDatasetSeparation(development, overlapHoldout('sourceFingerprintSha256', development.cases[0].sourceFingerprintSha256)));
expectReject('development/holdout family identity overlap rejects', () => validateDatasetSeparation(development, overlapHoldout('familyIdentity', development.cases[0].familyIdentity)));
expectReject('development/holdout provenance identity overlap rejects', () => validateDatasetSeparation(development, overlapHoldout('provenanceIdentity', development.cases[0].provenanceIdentity)));

expectReject('holdout oracle in worker-visible payload rejects', () => {
  const bad = clone(holdout);
  bad.cases[0].workerPayload.expectedOutcome = 'PASS';
  bad.cases[0].sourceFingerprintSha256 = canonicalSha256(bad.cases[0].workerPayload);
  sealDataset(bad);
  validateDataset(bad);
});
const workerEnvelope = buildWorkerEnvelope({
  configuration: reference,
  dataset: holdout,
  caseId: holdout.cases[0].id,
  trialId: 'zero-paid-trial-1'
});
const workerSerialized = JSON.stringify(workerEnvelope).toLowerCase();
assert.equal(workerSerialized.includes('expectedoutcome'), false);
assert.equal(workerSerialized.includes('oracleref'), false);
assert.equal(workerSerialized.includes('groundtruth'), false);
assert.deepEqual(workerEnvelope.sampling, reference.sampling);
pass('worker envelope structurally excludes evaluator oracle/expected outcome and pins sampling');

expectReject('missing dataset version rejects', () => {
  const bad = clone(holdout); delete bad.version; sealDataset(bad); validateDataset(bad);
});
expectReject('missing dataset SHA rejects', () => {
  const bad = clone(holdout); delete bad.datasetSha256; validateDataset(bad);
});
expectReject('oracle bundle pinned to wrong dataset rejects', () => {
  const bad = clone(holdoutOracle); bad.datasetSha256 = development.datasetSha256; sealOracle(bad); validateOracleBundle(holdout, bad);
});

expectReject('model-backed trial plan without finite positive bound rejects', () => {
  const bad = clone(reference); bad.trialPlan.trialsPerCase = 0; sealConfig(bad);
  validateSystemConfiguration(bad, { evaluatedCommitSha: bad.evaluatedCommitSha });
});
let providerInvocationCount = 0;
expectReject('model-backed execution without separate authorization fails before provider invocation', () => {
  assertBenchmarkExecutionAuthorized({ configuration: reference, authorization: null, lane: null });
  providerInvocationCount++;
});
assert.equal(providerInvocationCount, 0);
pass('authorization guard failed before any provider invocation');

const authorization = {
  schemaVersion: S5.auth,
  authorized: true,
  configurationSha256s: [reference.configurationSha256, challenger.configurationSha256],
  maxBudgetUsd: 1,
  ownerApprovalRef: 'synthetic-selftest-only-not-a-real-authorization'
};
expectReject('model-backed execution without isolated benchmark lane rejects', () => {
  assertBenchmarkExecutionAuthorized({ configuration: reference, authorization, lane: null });
});
expectReject('benchmark lane cannot permit Production credentials', () => {
  assertBenchmarkExecutionAuthorized({
    configuration: reference,
    authorization,
    lane: { schemaVersion: S5.lane, kind: 'benchmark-isolated', budgetUsd: 1, credentialLane: 'benchmark', productionCredentialsAllowed: true }
  });
});
const validLane = { schemaVersion: S5.lane, kind: 'benchmark-isolated', budgetUsd: 1, credentialLane: 'benchmark', productionCredentialsAllowed: false };
assert.equal(assertBenchmarkExecutionAuthorized({ configuration: reference, authorization, lane: validLane }).authorized, true);
pass('synthetic authorization/lane contract can validate without invoking a provider');

function makeTrace(config, dataset, caseId, suffix, { outcome = 'PASS', criticalFalsePass = false, costUsd = 0, latencyMs = 1 } = {}) {
  const caseEntry = dataset.cases.find((entry) => entry.id === caseId);
  return {
    schemaVersion: S5.trace,
    runId: `s5-zero-paid-${suffix}`,
    trialId: 'trial-1',
    evaluatedCommitSha: config.evaluatedCommitSha,
    configuration: { id: config.id, version: config.version, sha256: config.configurationSha256 },
    dataset: { id: dataset.datasetId, version: dataset.version, sha256: dataset.datasetSha256, split: dataset.split, caseId },
    model: { provider: config.model.provider, id: config.model.id },
    sampling: clone(config.sampling),
    promptRefs: clone(config.promptSkill.prompts),
    skillRefs: clone(config.promptSkill.skills),
    contextRefs: clone(config.contextContract.refs),
    verifierRefs: clone(config.verifier.refs),
    retry: { refs: clone(config.retry.refs), actions: [], count: 0 },
    escalation: { refs: clone(config.escalation.refs), actions: [], decision: 'none' },
    toolEvents: [{ kind: 'synthetic-zero-paid', action: 'contract-observation' }],
    evaluator: { outcome, criticalFalsePass, sourceRef: caseEntry.oracleRef },
    failureSignature: outcome === 'PASS' && !criticalFalsePass ? null : 'synthetic-contract-signal',
    costUsd,
    latencyMs,
    evidenceRefs: ['S5 deterministic contract selftest']
  };
}

const referenceDevTrace = makeTrace(referenceValidated, development, development.cases[0].id, 'ref-dev');
const referenceHoldTrace = makeTrace(referenceValidated, holdout, holdout.cases[0].id, 'ref-hold');
const challengerDevTrace = makeTrace(challengerValidated, development, development.cases[0].id, 'challenger-dev');
const challengerHoldTrace = makeTrace(challengerValidated, holdout, holdout.cases[0].id, 'challenger-hold', { criticalFalsePass: true });
for (const trace of [referenceDevTrace, referenceHoldTrace, challengerDevTrace, challengerHoldTrace]) validateBenchmarkTrace(trace);
pass('complete benchmark traces validate with exact configuration/dataset/sampling attribution');

const missingTraceFields = [
  ['configuration SHA', (t) => { delete t.configuration.sha256; }],
  ['evaluated commit', (t) => { delete t.evaluatedCommitSha; }],
  ['model identity', (t) => { delete t.model.id; }],
  ['sampling', (t) => { delete t.sampling; }],
  ['prompt refs', (t) => { t.promptRefs = []; }],
  ['skill refs', (t) => { t.skillRefs = []; }],
  ['context refs', (t) => { t.contextRefs = []; }],
  ['verifier refs', (t) => { t.verifierRefs = []; }],
  ['retry refs', (t) => { t.retry.refs = []; }],
  ['escalation refs', (t) => { t.escalation.refs = []; }],
  ['evaluator result', (t) => { delete t.evaluator; }],
  ['evidence refs', (t) => { t.evidenceRefs = []; }]
];
for (const [label, mutate] of missingTraceFields) expectReject(`trace missing ${label} rejects`, () => {
  const bad = clone(referenceHoldTrace); mutate(bad); validateBenchmarkTrace(bad);
});
expectReject('trace hidden chain-of-thought field rejects', () => {
  const bad = clone(referenceHoldTrace); bad.chainOfThought = 'must never persist'; validateBenchmarkTrace(bad);
});
expectReject('cost/latency observation without exact trial attribution rejects', () => {
  const bad = clone(referenceHoldTrace); delete bad.trialId; validateBenchmarkTrace(bad);
});
expectReject('trace model attribution that disagrees with configuration rejects during comparison', () => {
  const bad = clone(referenceHoldTrace); bad.model.id = challenger.model.id;
  buildBenchmarkResult({ configurations: [referenceValidated, challengerValidated], traces: [referenceDevTrace, bad, challengerDevTrace, challengerHoldTrace] });
});
expectReject('trace sampling attribution that disagrees with configuration rejects during comparison', () => {
  const bad = clone(referenceHoldTrace); bad.sampling.operations.build.maxOutputTokens = 42;
  buildBenchmarkResult({ configurations: [referenceValidated, challengerValidated], traces: [referenceDevTrace, bad, challengerDevTrace, challengerHoldTrace] });
});

const result = buildBenchmarkResult({
  configurations: [referenceValidated, challengerValidated],
  traces: [referenceDevTrace, referenceHoldTrace, challengerDevTrace, challengerHoldTrace]
});
validateAdvisoryBenchmarkResult(result);
const challengerMetric = result.metrics.find((metric) => metric.configurationSha256 === challenger.configurationSha256);
assert.equal(challengerMetric.criticalFalsePassCount, 1);
assert.equal(result.criticalIntegrityPolicy.tolerance, 0);
assert.equal(result.decision, 'human-review-required');
assert.equal(result.productionMutationAuthorized, false);
assert.equal(Number.isFinite(challengerMetric.expectedOutcomePassRateVariance), true);
assert.ok(challengerMetric.expectedOutcomePassRateWilson95);
pass('critical false PASS and uncertainty remain explicit and cannot be hidden by aggregate metrics');

expectReject('result omitting critical false PASS reporting rejects', () => {
  const bad = clone(result); delete bad.metrics[0].criticalFalsePassCount; validateAdvisoryBenchmarkResult(bad);
});
expectReject('different/unpinned dataset versions cannot be compared as equivalent', () => {
  const bad = clone(challengerHoldTrace); bad.dataset.version = '2.0.0'; bad.dataset.sha256 = '1'.repeat(64);
  buildBenchmarkResult({ configurations: [referenceValidated, challengerValidated], traces: [referenceDevTrace, referenceHoldTrace, challengerDevTrace, bad] });
});
for (const [label, mutation] of [
  ['router/default mutation', { routerMutation: { productionDefault: 'challenger' } }],
  ['prompt/skill/gate mutation', { promptMutation: true }],
  ['Candidate validation/activation/promotion', { validateCandidate: true }]
]) {
  expectReject(`benchmark result cannot authorize ${label}`, () => validateAdvisoryBenchmarkResult({ ...clone(result), ...mutation }));
}
expectReject('benchmark result cannot mark Production mutation authorized', () => {
  const bad = clone(result); bad.productionMutationAuthorized = true; validateAdvisoryBenchmarkResult(bad);
});

let fetchCalls = 0;
const priorFetch = globalThis.fetch;
globalThis.fetch = (...args) => { fetchCalls++; throw new Error(`unexpected provider/API call ${args[0]}`); };
try {
  validateSystemConfiguration(reference, { evaluatedCommitSha: reference.evaluatedCommitSha });
  validateDatasetSeparation(development, holdout);
  validateOracleBundle(holdout, holdoutOracle);
  buildWorkerEnvelope({ configuration: reference, dataset: holdout, caseId: holdout.cases[0].id, trialId: 'no-api' });
} finally {
  globalThis.fetch = priorFetch;
}
assert.equal(fetchCalls, 0);
pass('zero-paid S5 contract selftest performs zero fetch/provider/API calls');

console.log(`S5 SYSTEM CONFIGURATION BENCHMARK CONTRACTS PASS (${proved} proofs)`);
