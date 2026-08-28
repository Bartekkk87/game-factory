import { S5, canonicalJson, validateBenchmarkTrace } from './s5-benchmark-contract.mjs';

const MUTATION_KEYS = new Set([
  'productiondefault', 'routermutation', 'mutaterouter', 'promptmutation', 'skillmutation',
  'gatemutation', 'weakengate', 'validatecandidate', 'activatecandidate', 'promotecandidate',
  'applycandidate', 'autopromote'
]);
const fail = (message) => { throw new Error(`S5 benchmark result: ${message}`); };

function noMutationAuthority(value, pointer = 'result') {
  if (Array.isArray(value)) return value.forEach((item, index) => noMutationAuthority(item, `${pointer}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (MUTATION_KEYS.has(key.toLowerCase())) fail(`${pointer} contains forbidden mutation authority field ${key}`);
    noMutationAuthority(child, `${pointer}.${key}`);
  }
}

function summary(values) {
  if (!values.length) return null;
  const n = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  const variance = n > 1
    ? values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (n - 1)
    : 0;
  const stddev = Math.sqrt(variance);
  const margin95 = n > 1 ? 1.96 * stddev / Math.sqrt(n) : null;
  return {
    n,
    mean,
    variance,
    stddev,
    meanConfidence95: margin95 == null ? null : { low: mean - margin95, high: mean + margin95 }
  };
}

function wilson95(successes, observations) {
  if (!observations) return null;
  const z = 1.96;
  const p = successes / observations;
  const denominator = 1 + (z ** 2 / observations);
  const center = (p + (z ** 2 / (2 * observations))) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) / observations) + (z ** 2 / (4 * observations ** 2))) / denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

export function buildBenchmarkResult({ configurations, traces }) {
  if (!Array.isArray(configurations) || configurations.length < 2) fail('comparison needs at least two configurations');
  if (!Array.isArray(traces) || !traces.length) fail('comparison needs traces');
  const bySha = new Map(configurations.map((configuration) => [configuration.configurationSha256, configuration]));
  if (bySha.size !== configurations.length) fail('configuration SHAs must be unique');
  const rows = traces.map(validateBenchmarkTrace);
  const same = (a, b) => canonicalJson(a) === canonicalJson(b);

  for (const trace of rows) {
    const configuration = bySha.get(trace.configuration.sha256);
    if (!configuration) fail('trace references unknown configuration SHA');
    if (trace.configuration.id !== configuration.id || trace.configuration.version !== configuration.version || trace.evaluatedCommitSha !== configuration.evaluatedCommitSha) {
      fail('trace configuration attribution mismatch');
    }
    if (trace.model.provider !== configuration.model.provider || trace.model.id !== configuration.model.id) fail('trace model mismatch');
    if (!same(trace.sampling, configuration.sampling)) fail('trace sampling attribution mismatch');
    if (!same(trace.promptRefs, configuration.promptSkill.prompts)
      || !same(trace.skillRefs, configuration.promptSkill.skills)
      || !same(trace.contextRefs, configuration.contextContract.refs)
      || !same(trace.verifierRefs, configuration.verifier.refs)
      || !same(trace.retry.refs, configuration.retry.refs)
      || !same(trace.escalation.refs, configuration.escalation.refs)) {
      fail('trace configuration refs mismatch');
    }
    if (trace.retry.count > configuration.retry.maxAttempts) fail('trace retry count exceeds bound');
  }

  const datasetSets = new Map(configurations.map((configuration) => [configuration.configurationSha256, new Set()]));
  for (const trace of rows) {
    datasetSets.get(trace.configuration.sha256).add(`${trace.dataset.id}@${trace.dataset.version}#${trace.dataset.sha256}`);
  }
  const datasetFingerprints = [...datasetSets.values()].map((set) => [...set].sort().join('|'));
  if (datasetFingerprints.some((value) => !value) || new Set(datasetFingerprints).size !== 1) {
    fail('configurations were not evaluated on identical pinned dataset versions');
  }

  const metrics = configurations.map((configuration) => {
    const observations = rows.filter((trace) => trace.configuration.sha256 === configuration.configurationSha256);
    if (!observations.length) fail(`configuration ${configuration.id} has no observations`);
    const byCase = new Map();
    for (const trace of observations) {
      const key = `${trace.dataset.id}:${trace.dataset.caseId}`;
      const list = byCase.get(key) || [];
      list.push(trace);
      byCase.set(key, list);
    }
    const successes = observations.filter((trace) => trace.evaluator.outcome === 'PASS').length;
    const passRate = successes / observations.length;
    const costs = observations.filter((trace) => Number.isFinite(trace.costUsd)).map((trace) => trace.costUsd);
    const latency = observations.filter((trace) => Number.isFinite(trace.latencyMs)).map((trace) => trace.latencyMs);
    return {
      configurationId: configuration.id,
      configurationVersion: configuration.version,
      configurationSha256: configuration.configurationSha256,
      observations: observations.length,
      expectedOutcomePassRate: passRate,
      expectedOutcomePassRateVariance: passRate * (1 - passRate),
      expectedOutcomePassRateWilson95: wilson95(successes, observations.length),
      criticalFalsePassCount: observations.filter((trace) => trace.evaluator.criticalFalsePass).length,
      robustCaseRate: [...byCase.values()].filter((items) => items.every((trace) => trace.evaluator.outcome === 'PASS')).length / byCase.size,
      totalCostUsd: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
      costStats: summary(costs),
      meanLatencyMs: latency.length ? latency.reduce((a, b) => a + b, 0) / latency.length : null,
      latencyStats: summary(latency),
      failureSignatures: [...new Set(observations.map((trace) => trace.failureSignature).filter(Boolean))].sort()
    };
  });

  return {
    schemaVersion: S5.result,
    comparedConfigurations: metrics.map((metric) => ({ id: metric.configurationId, version: metric.configurationVersion, sha256: metric.configurationSha256 })),
    datasetFingerprint: datasetFingerprints[0],
    metrics,
    uncertaintyPolicy: {
      passRateInterval: 'wilson-95',
      continuousMetricVariance: 'sample-variance',
      meanInterval: 'normal-approximation-95-when-n>=2'
    },
    criticalIntegrityPolicy: { metric: 'criticalFalsePassCount', tolerance: 0, aggregateScoreCannotOverride: true },
    decision: 'human-review-required',
    productionMutationAuthorized: false
  };
}

function validInterval(interval) {
  return interval && Number.isFinite(interval.low) && Number.isFinite(interval.high) && interval.low <= interval.high;
}

export function validateAdvisoryBenchmarkResult(result) {
  const r = result;
  if (!r || r.schemaVersion !== S5.result) fail('schema invalid');
  noMutationAuthority(r);
  if (r.productionMutationAuthorized !== false) fail('result cannot authorize Production mutation');
  if (r.decision !== 'human-review-required') fail('decision must be human-review-required');
  const policy = r.criticalIntegrityPolicy;
  if (policy?.metric !== 'criticalFalsePassCount' || policy?.tolerance !== 0 || policy?.aggregateScoreCannotOverride !== true) {
    fail('critical false PASS policy missing');
  }
  if (r.uncertaintyPolicy?.passRateInterval !== 'wilson-95') fail('uncertainty policy missing');
  if (!Array.isArray(r.metrics) || r.metrics.length < 2) fail('metrics incomplete');
  for (const metric of r.metrics) {
    if (!Number.isInteger(metric.criticalFalsePassCount)) fail('criticalFalsePassCount missing');
    if (!Number.isFinite(metric.expectedOutcomePassRateVariance) || metric.expectedOutcomePassRateVariance < 0) fail('pass-rate variance missing');
    if (!validInterval(metric.expectedOutcomePassRateWilson95)) fail('pass-rate confidence interval missing');
    for (const key of ['costStats', 'latencyStats']) {
      const stats = metric[key];
      if (stats != null && (!Number.isInteger(stats.n) || !Number.isFinite(stats.mean) || !Number.isFinite(stats.variance) || !Number.isFinite(stats.stddev))) {
        fail(`${key} invalid`);
      }
    }
  }
  return structuredClone(r);
}
