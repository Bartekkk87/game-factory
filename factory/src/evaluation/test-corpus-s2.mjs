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
const baselinePath = path.join(root, 'evaluation/baselines/S2-S1-CLOSURE-REFERENCE-2026-08-28.json');

const registryText = fs.readFileSync(registryPath, 'utf8');
const manifestText = fs.readFileSync(manifestPath, 'utf8');
const registry = JSON.parse(registryText);
const manifest = JSON.parse(manifestText);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

assert.equal(gitBlobSha(registryText), baseline.corpusContract.registryGitBlobSha);
assert.equal(gitBlobSha(manifestText), baseline.corpusContract.s1ManifestGitBlobSha);

const catalog = buildCorpusCatalog(registry, manifest);
assert.equal(catalog.filter((entry) => entry.population === 'seed').length, 15);
assert.equal(catalog.filter((entry) => entry.population !== 'seed').length, 14);
assert.equal(catalog.length, baseline.corpusContract.totalCases);
assert.equal(new Set(catalog.map((entry) => entry.id)).size, catalog.length);
assert.equal(new Set(catalog.map((entry) => entry.script)).size, 8);

const perfectResults = catalog.map((entry) => ({
  ...entry,
  caseId: entry.id,
  expectedCaseResult: entry.expectedOutcome.caseResult,
  actualCaseResult: entry.expectedOutcome.caseResult,
  matchedExpected: true,
  falsePass: false,
  criticalFalsePass: false
}));
const perfectSummary = summarizeCaseResults(perfectResults);
assert.equal(perfectSummary.totalCases, 29);
assert.equal(perfectSummary.matchedExpectedCount, 29);
assert.equal(perfectSummary.expectedMismatchCount, 0);
assert.equal(perfectSummary.expectedOutcomePassRate, 1);
assert.equal(perfectSummary.criticalFalsePassCount, 0);
assert.equal(perfectSummary.criticalMismatchCount, 0);
assert.deepEqual(
  {
    totalCases: perfectSummary.totalCases,
    matchedExpectedCount: perfectSummary.matchedExpectedCount,
    expectedMismatchCount: perfectSummary.expectedMismatchCount,
    expectedOutcomePassRate: perfectSummary.expectedOutcomePassRate,
    criticalFalsePassCount: perfectSummary.criticalFalsePassCount,
    criticalMismatchCount: perfectSummary.criticalMismatchCount
  },
  baseline.metrics
);

const synthetic = [
  {
    caseId: 'standard-pass',
    domain: 'game-production',
    failureClass: 'standard-cluster',
    severity: 'standard',
    expectedCaseResult: 'PASS',
    actualCaseResult: 'PASS',
    matchedExpected: true,
    falsePass: false,
    criticalFalsePass: false
  },
  {
    caseId: 'critical-false-pass',
    domain: 'factory-reliability',
    failureClass: 'integrity-cluster',
    severity: 'critical-integrity',
    expectedCaseResult: 'FAIL',
    actualCaseResult: 'PASS',
    matchedExpected: false,
    falsePass: true,
    criticalFalsePass: true
  }
];
const syntheticSummary = summarizeCaseResults(synthetic);
assert.equal(syntheticSummary.totalCases, 2);
assert.equal(syntheticSummary.expectedOutcomePassRate, 0.5);
assert.equal(syntheticSummary.criticalFalsePassCount, 1);
assert.equal(syntheticSummary.criticalMismatchCount, 1);

const syntheticBaseline = {
  baselineId: 'synthetic',
  evaluatedCommitSha: 'base',
  metrics: {
    totalCases: 2,
    matchedExpectedCount: 2,
    expectedMismatchCount: 0,
    expectedOutcomePassRate: 1,
    criticalFalsePassCount: 0,
    criticalMismatchCount: 0
  }
};
const delta = compareToBaseline(syntheticSummary, syntheticBaseline);
assert.equal(delta.expectedOutcomePassRateDelta, -0.5);
assert.equal(delta.expectedMismatchDelta, 1);
assert.equal(delta.criticalFalsePassDelta, 1);
assert.equal(delta.criticalMismatchDelta, 1);

console.log('Golden Corpus S2 baseline + metric semantics PASS');
