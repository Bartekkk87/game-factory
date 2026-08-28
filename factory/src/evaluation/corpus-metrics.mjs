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

function legacySeed(entry, manifest) {
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
    sourceRefs: entry.sourceRefs || [],
    expectedOutcome: entry.expectedOutcome,
    historicalProvenance: entry.historicalProvenance || null,
    script
  };
}

function historicalSeed(entry) {
  return {
    id: entry.id,
    population: 'historical-regression',
    parentSeedId: null,
    varianceDimension: null,
    controlType: 'historical-regression',
    domain: entry.domain,
    failureClass: entry.failureClass,
    varianceFamily: entry.varianceFamily,
    tier: entry.tier,
    severity: entry.severity,
    sourceKind: entry.sourceKind,
    sourceRefs: entry.sourceRefs || [],
    expectedOutcome: entry.expectedOutcome,
    historicalProvenance: entry.historicalProvenance || null,
    script: null
  };
}

export function buildCorpusCatalog(registry, manifest, historicalRegistry = null, oracleManifest = null) {
  const seeds = (registry?.cases || [])
    .filter((entry) => entry?.seed && entry?.active)
    .map((entry) => legacySeed(entry, manifest));

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
      sourceRefs: entry.sourceRefs || [],
      expectedOutcome: entry.expectedOutcome,
      historicalProvenance: null,
      script: entry.script
    }));

  const historical = (historicalRegistry?.cases || [])
    .filter((entry) => entry?.seed && entry?.active)
    .map((entry) => historicalSeed(entry));

  const all = [...seeds, ...variants, ...historical].sort(byId);
  const ids = new Set();
  for (const entry of all) {
    if (!entry.id) throw new Error('corpus case id missing');
    if (ids.has(entry.id)) throw new Error(`corpus case id collision: ${entry.id}`);
    ids.add(entry.id);
    if (!['PASS', 'FAIL'].includes(entry.expectedOutcome?.caseResult)) {
      throw new Error(`unsupported expected case result for ${entry.id}`);
    }
    if (entry.sourceKind === 'historical-regression') {
      if (entry.population !== 'historical-regression' || entry.tier !== 2) {
        throw new Error(`historical regression must be tier 2: ${entry.id}`);
      }
      if (!String(entry.historicalProvenance?.originRunId || '').trim()) {
        throw new Error(`historical regression originRunId missing: ${entry.id}`);
      }
      if (!/^[0-9a-f]{40}$/.test(String(entry.historicalProvenance?.fixCommitSha || ''))) {
        throw new Error(`historical regression fixCommitSha invalid: ${entry.id}`);
      }
    }
  }

  if (oracleManifest) {
    if (oracleManifest.executionContract?.runner !== 'node-case-oracle'
      || oracleManifest.executionContract?.oracle !== 'case-specific-assertion') {
      throw new Error('unsupported case-oracle execution contract');
    }
    const mappings = oracleManifest.caseOracles || {};
    for (const entry of all) {
      const oracleScript = mappings[entry.id];
      if (!oracleScript) throw new Error(`case-specific oracle missing: ${entry.id}`);
      entry.oracleScript = oracleScript;
    }
    for (const mappedCaseId of Object.keys(mappings)) {
      if (!ids.has(mappedCaseId)) throw new Error(`orphan case-oracle mapping: ${mappedCaseId}`);
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
  const independentObservationCount = rows.filter((row) => row.independentObservation === true).length;
  return {
    totalCases,
    matchedExpectedCount,
    expectedMismatchCount,
    expectedOutcomePassRate: totalCases ? matchedExpectedCount / totalCases : 0,
    criticalFalsePassCount,
    criticalMismatchCount,
    independentObservationCount,
    observationDeficit: totalCases - independentObservationCount
  };
}

export function summarizeCaseResults(results) {
  const summary = summarizeRows(results);
  return {
    ...summary,
    rollups: {
      domain: bucket(results, 'domain'),
      failureClass: bucket(results, 'failureClass'),
      severity: bucket(results, 'severity'),
      sourceKind: bucket(results, 'sourceKind'),
      tier: bucket(results, 'tier')
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
        criticalFalsePassDelta: deltaNumber(metrics.criticalFalsePassCount, 0),
        observationDeficit: Number(metrics.observationDeficit || 0)
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
    independentObservationCountDelta: deltaNumber(
      summary.independentObservationCount,
      baselineMetrics.independentObservationCount
    ),
    observationDeficit: Number(summary.observationDeficit || 0),
    rollups: {
      domain: rollupDelta(summary.rollups?.domain),
      failureClass: rollupDelta(summary.rollups?.failureClass),
      severity: rollupDelta(summary.rollups?.severity),
      sourceKind: rollupDelta(summary.rollups?.sourceKind),
      tier: rollupDelta(summary.rollups?.tier)
    }
  };
}
