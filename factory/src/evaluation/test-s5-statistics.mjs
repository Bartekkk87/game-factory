import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.mjs';
import { S5, validateSystemConfiguration, validateBenchmarkTrace } from './s5-benchmark-contract.mjs';
import { buildBenchmarkResult, validateAdvisoryBenchmarkResult } from './s5-benchmark-result.mjs';

const load = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
const reference = load('evaluation/benchmark/configurations/reference-luna-v1.json');
const challenger = load('evaluation/benchmark/configurations/challenger-deepseek-v31.json');
validateSystemConfiguration(reference);
validateSystemConfiguration(challenger);

const missingSampling = structuredClone(reference);
delete missingSampling.sampling;
assert.throws(() => validateSystemConfiguration(missingSampling), /sampling required/);
const invalidLunaTemperature = structuredClone(reference);
invalidLunaTemperature.sampling.operations.build.temperature = 0.3;
assert.throws(() => validateSystemConfiguration(invalidLunaTemperature), /temperature must be null/);

const dataset = {
  id: 'fixture-dataset',
  version: '1.0.0',
  sha256: 'd'.repeat(64),
  split: 'development-regression'
};

function trace(configuration, index, outcome, latencyMs, costUsd) {
  return {
    schemaVersion: S5.trace,
    runId: `run-${configuration.id}-${index}`,
    trialId: `trial-${index}`,
    evaluatedCommitSha: configuration.evaluatedCommitSha,
    configuration: { id: configuration.id, version: configuration.version, sha256: configuration.configurationSha256 },
    dataset: { ...dataset, caseId: `case-${index % 2}` },
    model: { provider: configuration.model.provider, id: configuration.model.id },
    sampling: structuredClone(configuration.sampling),
    promptRefs: structuredClone(configuration.promptSkill.prompts),
    skillRefs: structuredClone(configuration.promptSkill.skills),
    contextRefs: structuredClone(configuration.contextContract.refs),
    verifierRefs: structuredClone(configuration.verifier.refs),
    retry: { refs: structuredClone(configuration.retry.refs), count: 0, actions: [] },
    escalation: { refs: structuredClone(configuration.escalation.refs), actions: [], decision: 'none' },
    toolEvents: [],
    evaluator: { outcome, criticalFalsePass: false, sourceRef: `fixture/evaluator-${index}.json` },
    evidenceRefs: [`fixture/evidence-${index}.json`],
    failureSignature: outcome === 'FAIL' ? `failure-${index}` : null,
    costUsd,
    latencyMs
  };
}

const traces = [
  trace(reference, 1, 'PASS', 100, 0.10),
  trace(reference, 2, 'PASS', 120, 0.12),
  trace(reference, 3, 'FAIL', 140, 0.14),
  trace(challenger, 1, 'PASS', 80, 0.05),
  trace(challenger, 2, 'PASS', 90, 0.06),
  trace(challenger, 3, 'PASS', 100, 0.07)
];
traces.forEach(validateBenchmarkTrace);

const result = buildBenchmarkResult({ configurations: [reference, challenger], traces });
validateAdvisoryBenchmarkResult(result);
for (const metric of result.metrics) {
  assert.equal(Number.isFinite(metric.expectedOutcomePassRateVariance), true);
  assert.equal(Number.isFinite(metric.expectedOutcomePassRateWilson95.low), true);
  assert.equal(Number.isFinite(metric.expectedOutcomePassRateWilson95.high), true);
  assert.equal(Number.isFinite(metric.latencyStats.variance), true);
  assert.equal(Number.isFinite(metric.costStats.stddev), true);
  assert.equal(metric.latencyStats.n, 3);
}
assert.equal(result.uncertaintyPolicy.passRateInterval, 'wilson-95');

const noSamplingTrace = structuredClone(traces[0]);
delete noSamplingTrace.sampling;
assert.throws(() => validateBenchmarkTrace(noSamplingTrace), /trace\.sampling required/);

const mismatchedSampling = structuredClone(traces);
mismatchedSampling[0].sampling.operations.build.maxOutputTokens = 42;
assert.throws(
  () => buildBenchmarkResult({ configurations: [reference, challenger], traces: mismatchedSampling }),
  /sampling attribution mismatch/
);

console.log('S5 sampling + uncertainty selftest: PASS');
