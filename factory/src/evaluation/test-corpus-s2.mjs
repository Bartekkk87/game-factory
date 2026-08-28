import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCorpusCatalog,
  compareToBaseline,
  gitBlobSha,
  summarizeCaseResults
} from './corpus-metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const registryPath = path.join(root, 'evaluation/corpus/registry.json');
const manifestPath = path.join(root, 'evaluation/corpus/s1-cases.json');
const historicalPath = path.join(root, 'evaluation/corpus/historical-regressions.json');
const oraclePath = path.join(root, 'evaluation/corpus/case-oracles.json');
const baselinePath = path.join(root, 'evaluation/baselines/S2-AUDIT-V2-A1-A2-REFERENCE-2026-08-29.json');

const registryText = fs.readFileSync(registryPath, 'utf8');
const manifestText = fs.readFileSync(manifestPath, 'utf8');
const historicalText = fs.readFileSync(historicalPath, 'utf8');
const oracleText = fs.readFileSync(oraclePath, 'utf8');
const registry = JSON.parse(registryText);
const manifest = JSON.parse(manifestText);
const historical = JSON.parse(historicalText);
const oracles = JSON.parse(oracleText);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

assert.equal(baseline.schemaVersion, 'game-factory.golden-corpus-s2-baseline/v2');
assert.equal(gitBlobSha(registryText), baseline.corpusContract.registryGitBlobSha);
assert.equal(gitBlobSha(manifestText), baseline.corpusContract.s1ManifestGitBlobSha);
assert.equal(gitBlobSha(historicalText), baseline.corpusContract.historicalRegistryGitBlobSha);
assert.equal(gitBlobSha(oracleText), baseline.corpusContract.caseOracleManifestGitBlobSha);

const catalog = buildCorpusCatalog(registry, manifest, historical, oracles);
assert.equal(catalog.filter((entry) => entry.population === 'seed').length, 15);
assert.equal(catalog.filter((entry) => entry.population === 'development-regression').length, 14);
assert.equal(catalog.filter((entry) => entry.population === 'historical-regression').length, 5);
assert.equal(catalog.filter((entry) => entry.sourceKind === 'historical-regression').length, 5);
assert.equal(catalog.length, 34);
assert.equal(catalog.length, baseline.corpusContract.totalCases);
assert.equal(new Set(catalog.map((entry) => entry.id)).size, catalog.length);
assert.equal(new Set(catalog.map((entry) => entry.oracleScript)).size, 9);
assert.equal(Object.keys(oracles.caseOracles).length, catalog.length);
for (const historicalCase of catalog.filter((entry) => entry.sourceKind === 'historical-regression')) {
  assert.equal(historicalCase.tier, 2);
  assert.match(historicalCase.historicalProvenance.originRunId, /^\d{8}-\d{6}$/);
  assert.match(historicalCase.historicalProvenance.fixCommitSha, /^[0-9a-f]{40}$/);
}

const perfectResults = catalog.map((entry) => ({
  ...entry,
  caseId: entry.id,
  expectedCaseResult: entry.expectedOutcome.caseResult,
  actualCaseResult: entry.expectedOutcome.caseResult,
  matchedExpected: true,
  falsePass: false,
  criticalFalsePass: false,
  independentObservation: true
}));
const perfectSummary = summarizeCaseResults(perfectResults);
assert.equal(perfectSummary.totalCases, 34);
assert.equal(perfectSummary.matchedExpectedCount, 34);
assert.equal(perfectSummary.expectedMismatchCount, 0);
assert.equal(perfectSummary.expectedOutcomePassRate, 1);
assert.equal(perfectSummary.criticalFalsePassCount, 0);
assert.equal(perfectSummary.criticalMismatchCount, 0);
assert.equal(perfectSummary.independentObservationCount, 34);
assert.equal(perfectSummary.observationDeficit, 0);
assert.equal(perfectSummary.rollups.sourceKind['historical-regression'].totalCases, 5);
assert.equal(perfectSummary.rollups.tier['2'].totalCases, 5);
assert.deepEqual(
  {
    totalCases: perfectSummary.totalCases,
    matchedExpectedCount: perfectSummary.matchedExpectedCount,
    expectedMismatchCount: perfectSummary.expectedMismatchCount,
    expectedOutcomePassRate: perfectSummary.expectedOutcomePassRate,
    criticalFalsePassCount: perfectSummary.criticalFalsePassCount,
    criticalMismatchCount: perfectSummary.criticalMismatchCount,
    independentObservationCount: perfectSummary.independentObservationCount,
    observationDeficit: perfectSummary.observationDeficit
  },
  baseline.metrics
);

const incompleteObservations = perfectResults.map((entry, index) => ({
  ...entry,
  independentObservation: index !== 0
}));
const incompleteSummary = summarizeCaseResults(incompleteObservations);
assert.equal(incompleteSummary.independentObservationCount, 33);
assert.equal(incompleteSummary.observationDeficit, 1);
const incompleteDelta = compareToBaseline(incompleteSummary, baseline);
assert.equal(incompleteDelta.independentObservationCountDelta, -1);
assert.equal(incompleteDelta.observationDeficit, 1);

const synthetic = [
  {
    caseId: 'standard-pass', domain: 'game-production', failureClass: 'standard-cluster', severity: 'standard', sourceKind: 'selftest', tier: 0,
    expectedCaseResult: 'PASS', actualCaseResult: 'PASS', matchedExpected: true, falsePass: false, criticalFalsePass: false, independentObservation: true
  },
  {
    caseId: 'critical-false-pass', domain: 'factory-reliability', failureClass: 'integrity-cluster', severity: 'critical-integrity', sourceKind: 'selftest', tier: 0,
    expectedCaseResult: 'FAIL', actualCaseResult: 'PASS', matchedExpected: false, falsePass: true, criticalFalsePass: true, independentObservation: true
  }
];
const syntheticSummary = summarizeCaseResults(synthetic);
assert.equal(syntheticSummary.totalCases, 2);
assert.equal(syntheticSummary.expectedOutcomePassRate, 0.5);
assert.equal(syntheticSummary.criticalFalsePassCount, 1);
assert.equal(syntheticSummary.criticalMismatchCount, 1);
assert.equal(syntheticSummary.independentObservationCount, 2);

const syntheticBaseline = {
  baselineId: 'synthetic', evaluatedCommitSha: 'base',
  metrics: {
    totalCases: 2, matchedExpectedCount: 2, expectedMismatchCount: 0, expectedOutcomePassRate: 1,
    criticalFalsePassCount: 0, criticalMismatchCount: 0, independentObservationCount: 2, observationDeficit: 0
  }
};
const delta = compareToBaseline(syntheticSummary, syntheticBaseline);
assert.equal(delta.expectedOutcomePassRateDelta, -0.5);
assert.equal(delta.expectedMismatchDelta, 1);
assert.equal(delta.criticalFalsePassDelta, 1);
assert.equal(delta.criticalMismatchDelta, 1);
assert.equal(delta.independentObservationCountDelta, 0);

console.log('Golden Corpus S2 v2 PASS: 34 cases require 34 independent case-oracle observations; 5 production-derived historical regressions are explicit.');
