import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildCorpusCatalog,
  compareToBaseline,
  gitBlobSha,
  summarizeCaseResults
} from './corpus-metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

function safeScriptPath(script) {
  const value = String(script || '');
  if (!/^[A-Za-z0-9._/-]+\.mjs$/.test(value) || path.isAbsolute(value) || value.split('/').includes('..')) {
    throw new Error(`unsafe evaluation script: ${value}`);
  }
  const absolute = path.resolve(root, value);
  if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute)) {
    throw new Error(`evaluation script unavailable: ${value}`);
  }
  return absolute;
}

function normalizedDiagnostic(text) {
  return String(text || '')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
    ?.replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/(?:[A-Za-z]:)?[\\/](?:[^\s:]+[\\/])+[^\s:]*/g, '<path>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')
    .replace(/:\d+:\d+/g, ':<loc>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .slice(0, 240) || null;
}

function failureSignature(stdout, stderr) {
  const normalized = normalizedDiagnostic(stderr) || normalizedDiagnostic(stdout);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 24);
}

function caseMismatchSignature(entry, expectedCaseResult, actualCaseResult, execution) {
  const semanticMismatch = JSON.stringify({
    caseId: entry.id,
    failureClass: entry.failureClass || 'unclassified',
    expectedCaseResult,
    actualCaseResult,
    executionFailureSignature: execution.failureSignature || null
  });
  return crypto.createHash('sha256').update(semanticMismatch).digest('hex').slice(0, 24);
}

function currentCommitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return git.status === 0 ? git.stdout.trim() : 'unknown';
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (!args.length) return { out: null };
  if (args.length === 2 && args[0] === '--out' && args[1]) return { out: args[1] };
  throw new Error('usage: node factory/src/evaluation/run-corpus.mjs [--out <repo-relative-json-path>]');
}

function writeReport(relPath, report) {
  if (!relPath) return;
  if (path.isAbsolute(relPath) || relPath.split('/').includes('..') || !relPath.endsWith('.json')) {
    throw new Error(`unsafe report output path: ${relPath}`);
  }
  const absolute = path.resolve(root, relPath);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error(`unsafe report output path: ${relPath}`);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
}

function runScript(script) {
  const absolute = safeScriptPath(script);
  const started = Date.now();
  const child = spawnSync(process.execPath, [absolute], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 32 * 1024 * 1024
  });
  const childExitCode = child.status ?? 1;
  return {
    script,
    childExitCode,
    caseResult: childExitCode === 0 ? 'PASS' : 'FAIL',
    durationMs: Date.now() - started,
    failureSignature: childExitCode === 0 ? null : failureSignature(child.stdout, child.stderr),
    diagnostic: childExitCode === 0 ? null : (normalizedDiagnostic(child.stderr) || normalizedDiagnostic(child.stdout))
  };
}

try {
  const { out } = parseArgs(process.argv);
  const registryPath = 'evaluation/corpus/registry.json';
  const manifestPath = 'evaluation/corpus/s1-cases.json';
  const baselinePath = 'evaluation/baselines/S2-S1-CLOSURE-REFERENCE-2026-08-28.json';
  const registryText = fs.readFileSync(path.join(root, registryPath), 'utf8');
  const manifestText = fs.readFileSync(path.join(root, manifestPath), 'utf8');
  const registry = JSON.parse(registryText);
  const manifest = JSON.parse(manifestText);
  const baseline = readJson(baselinePath);

  const registryBlobSha = gitBlobSha(registryText);
  const manifestBlobSha = gitBlobSha(manifestText);
  const baselineCompatibility = {
    registryBlobMatch: registryBlobSha === baseline.corpusContract?.registryGitBlobSha,
    s1ManifestBlobMatch: manifestBlobSha === baseline.corpusContract?.s1ManifestGitBlobSha
  };
  baselineCompatibility.compatible = baselineCompatibility.registryBlobMatch && baselineCompatibility.s1ManifestBlobMatch;
  if (!baselineCompatibility.compatible) {
    throw new Error(
      `corpus drift detected; baseline ${baseline.baselineId} is not comparable to the current registry/manifest`
    );
  }

  const catalog = buildCorpusCatalog(registry, manifest);
  if (catalog.length !== baseline.corpusContract?.totalCases) {
    throw new Error(`baseline case-count mismatch: expected ${baseline.corpusContract?.totalCases}, found ${catalog.length}`);
  }

  const scripts = [...new Set(catalog.map((entry) => entry.script))].sort();
  const executions = new Map(scripts.map((script) => [script, runScript(script)]));
  const results = catalog.map((entry) => {
    const execution = executions.get(entry.script);
    const expectedCaseResult = entry.expectedOutcome.caseResult;
    const actualCaseResult = execution.caseResult;
    const matchedExpected = actualCaseResult === expectedCaseResult;
    const falsePass = actualCaseResult === 'PASS' && expectedCaseResult === 'FAIL';
    const mismatchDiagnostic = matchedExpected
      ? null
      : execution.diagnostic || `expected ${expectedCaseResult}, observed ${actualCaseResult}`;
    return {
      caseId: entry.id,
      population: entry.population,
      parentSeedId: entry.parentSeedId,
      varianceDimension: entry.varianceDimension,
      controlType: entry.controlType,
      domain: entry.domain,
      failureClass: entry.failureClass,
      varianceFamily: entry.varianceFamily,
      tier: entry.tier,
      severity: entry.severity,
      sourceKind: entry.sourceKind,
      script: entry.script,
      expectedCaseResult,
      actualCaseResult,
      matchedExpected,
      falsePass,
      criticalFalsePass: falsePass && entry.severity === 'critical-integrity',
      failureSignature: matchedExpected
        ? null
        : caseMismatchSignature(entry, expectedCaseResult, actualCaseResult, execution),
      diagnostic: mismatchDiagnostic
    };
  });

  const summary = summarizeCaseResults(results);
  const delta = compareToBaseline(summary, baseline);
  const report = {
    schemaVersion: 'game-factory.golden-corpus-evaluation-report/v1',
    evaluatedCommitSha: currentCommitSha(),
    generatedAt: new Date().toISOString(),
    baseline: {
      baselineId: baseline.baselineId,
      evaluatedCommitSha: baseline.evaluatedCommitSha,
      supportingFullVerifier: baseline.supportingFullVerifier,
      compatibility: baselineCompatibility
    },
    execution: {
      runner: 'deduplicated-node-selftests',
      oracle: 'expected-vs-actual-case-result',
      casesEvaluated: results.length,
      uniqueScriptsExecuted: scripts.length,
      apiCalls: 0,
      modelBackedCases: 0,
      usdCost: 0,
      scripts: [...executions.values()]
    },
    metrics: summary,
    delta,
    policy: {
      baselineCorpusDriftAllowed: false,
      criticalFalsePassTolerance: 0,
      expectedMismatchCount: summary.expectedMismatchCount,
      criticalFalsePassRegression: summary.criticalFalsePassCount > Number(baseline.metrics?.criticalFalsePassCount || 0),
      corpusRegression: summary.expectedMismatchCount > Number(baseline.metrics?.expectedMismatchCount || 0)
    },
    cases: results
  };

  writeReport(out, report);
  console.log(JSON.stringify(report));

  if (report.policy.criticalFalsePassRegression || report.policy.corpusRegression) {
    process.exit(1);
  }
} catch (error) {
  console.error(`S2 EVALUATION ERROR: ${error?.message || error}`);
  process.exit(2);
}
