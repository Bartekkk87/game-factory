import crypto from 'node:crypto';

function byId(a, b) {
  return String(a.id || a.caseId).localeCompare(String(b.id || b.caseId));
}

export function gitBlobSha(text) {
  const body = Buffer.from(String(text), 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

export function buildCorpusCatalog(registry, manifest) {
  const seeds = (registry?.cases || [])
    .filter((entry) => entry?.seed && entry?.active)
    .map((entry) => {
      const script = manifest?.seedScripts?.[entry.id];
      if (!script) throw new Error(`seed execution contract missing: ${entry.id}`);
      return {
        id: entry.id,
        population: 'seed',
        parentSeedId: null,
        varianceDimension: null,
        controlType: 'seed',
        domain: entry.domain,
        failureClass: entry.failureClass,
        varianceFamily: entry.varianceFamily,
        tier: entry.tier,
        severity: entry.severity,
        sourceKind: entry.sourceKind,
        expectedOutcome: entry.expectedOutcome,
        script
      };
    });

  const variants = (manifest?.variants || [])
    .filter((entry) => entry?.active)
    .map((entry) => ({
      id: entry.id,
      population: manifest.corpusPopulation || 'development-regression',
      parentSeedId: entry.parentSeedId,
      varianceDimension: entry.varianceDimension,
      controlType: entry.controlType,
      domain: entry.domain,
      failureClass: entry.failureClass,
      varianceFamily: entry.varianceFamily,
      tier: entry.tier,
      severity: entry.severity,
      sourceKind: entry.sourceKind,
      expectedOutcome: entry.expectedOutcome,
      script: entry.script
    }));

  const all = [...seeds, ...variants].sort(byId);
  const ids = new Set();
  for (const entry of all) {
    if (!entry.id) throw new Error('corpus case id missing');
    if (ids.has(entry.id)) throw new Error(`corpus case id collision: ${entry.id}`);
    ids.add(entry.id);
    if (!['PASS', 'FAIL'].includes(entry.expectedOutcome?.caseResult)) {
      throw new Error(`unsupported expected case result for ${entry.id}`);
    }
  }
  return all;
}

function bucket(entries, key) {
  const groups = new Map();
  for (const entry of entries) {
    const value = String(entry[key] ?? 'unknown');
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(entry);
  }
  return Object.fromEntries(
    [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, rows]) => [name, summarizeRows(rows)])
  );
}

function summarizeRows(rows) {
  const totalCases = rows.length;
  const matchedExpectedCount = rows.filter((row) => row.matchedExpected).length;
  const expectedMismatchCount = totalCases - matchedExpectedCount;
  const criticalFalsePassCount = rows.filter((row) => row.criticalFalsePass).length;
  const criticalMismatchCount = rows.filter(
    (row) => row.severity === 'critical-integrity' && !row.matchedExpected
  ).length;
  return {
    totalCases,
    matchedExpectedCount,
    expectedMismatchCount,
    expectedOutcomePassRate: totalCases ? matchedExpectedCount / totalCases : 0,
    criticalFalsePassCount,
    criticalMismatchCount
  };
}

export function summarizeCaseResults(results) {
  const summary = summarizeRows(results);
  return {
    ...summary,
    rollups: {
      domain: bucket(results, 'domain'),
      failureClass: bucket(results, 'failureClass'),
      severity: bucket(results, 'severity')
    }
  };
}

function deltaNumber(current, baseline) {
  return Number((Number(current || 0) - Number(baseline || 0)).toFixed(12));
}

function rollupDelta(currentRollup) {
  return Object.fromEntries(
    Object.entries(currentRollup || {}).map(([name, metrics]) => [
      name,
      {
        expectedOutcomePassRateDelta: deltaNumber(metrics.expectedOutcomePassRate, 1),
        expectedMismatchDelta: deltaNumber(metrics.expectedMismatchCount, 0),
        criticalFalsePassDelta: deltaNumber(metrics.criticalFalsePassCount, 0)
      }
    ])
  );
}

export function compareToBaseline(summary, baseline) {
  const baselineMetrics = baseline?.metrics || {};
  return {
    baselineId: baseline?.baselineId || null,
    baselineCommitSha: baseline?.evaluatedCommitSha || null,
    expectedOutcomePassRateDelta: deltaNumber(
      summary.expectedOutcomePassRate,
      baselineMetrics.expectedOutcomePassRate
    ),
    matchedExpectedDelta: deltaNumber(
      summary.matchedExpectedCount,
      baselineMetrics.matchedExpectedCount
    ),
    expectedMismatchDelta: deltaNumber(
      summary.expectedMismatchCount,
      baselineMetrics.expectedMismatchCount
    ),
    criticalFalsePassDelta: deltaNumber(
      summary.criticalFalsePassCount,
      baselineMetrics.criticalFalsePassCount
    ),
    criticalMismatchDelta: deltaNumber(
      summary.criticalMismatchCount,
      baselineMetrics.criticalMismatchCount
    ),
    rollups: {
      domain: rollupDelta(summary.rollups?.domain),
      failureClass: rollupDelta(summary.rollups?.failureClass),
      severity: rollupDelta(summary.rollups?.severity)
    }
  };
}
