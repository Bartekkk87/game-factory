import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const registryPath = path.join(root, 'evaluation/corpus/registry.json');
const schemaPath = path.join(root, 'evaluation/corpus/schema.json');
const baselinePath = path.join(root, 'evaluation/baselines/S0-2026-08-28.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

assert.equal(schema.$id, 'game-factory.golden-corpus-case/v1');
assert.equal(registry.schemaVersion, 'game-factory.golden-corpus/v1');
assert.equal(registry.status, 'baseline');
assert.ok(Array.isArray(registry.cases) && registry.cases.length > 0);
assert.equal(baseline.schemaVersion, 'game-factory.golden-corpus-baseline/v1');
assert.equal(baseline.baselineType, 'coverage-inventory');
assert.equal(baseline.corpusId, registry.corpusId);
assert.equal(baseline.expectedOutcomeQualityScore, 'not-computed-until-S2');
assert.equal(baseline.criticalFalsePassCount, 'not-computed-until-S2');

const domains = new Set(['game-production', 'factory-reliability']);
const tiers = new Set([0, 1, 2]);
const severities = new Set(['standard', 'critical-integrity']);
const sourceKinds = new Set(['fixture', 'selftest', 'historical-regression']);
const ids = new Set();

for (const entry of registry.cases) {
  assert.equal(entry.schemaVersion, 'game-factory.golden-corpus-case/v1', `${entry.id}: schemaVersion`);
  assert.match(entry.id, /^[a-z0-9][a-z0-9-]+$/, `${entry.id}: invalid id`);
  assert.equal(ids.has(entry.id), false, `duplicate corpus case id: ${entry.id}`);
  ids.add(entry.id);

  assert.equal(domains.has(entry.domain), true, `${entry.id}: invalid domain`);
  assert.equal(tiers.has(entry.tier), true, `${entry.id}: invalid tier`);
  assert.equal(severities.has(entry.severity), true, `${entry.id}: invalid severity`);
  assert.equal(sourceKinds.has(entry.sourceKind), true, `${entry.id}: invalid sourceKind`);
  assert.equal(typeof entry.failureClass, 'string');
  assert.ok(entry.failureClass.trim(), `${entry.id}: empty failureClass`);
  assert.equal(typeof entry.varianceFamily, 'string');
  assert.ok(entry.varianceFamily.trim(), `${entry.id}: empty varianceFamily`);
  assert.equal(entry.expectedOutcome?.caseResult, 'PASS', `${entry.id}: S0 seed must have a passing selftest oracle`);
  assert.ok(String(entry.expectedOutcome?.systemBehavior || '').trim(), `${entry.id}: missing expected system behavior`);
  assert.equal(typeof entry.seed, 'boolean', `${entry.id}: seed must be boolean`);
  assert.equal(typeof entry.active, 'boolean', `${entry.id}: active must be boolean`);
  assert.equal(typeof entry.notes, 'string', `${entry.id}: notes must be string`);
  assert.ok(Array.isArray(entry.sourceRefs) && entry.sourceRefs.length > 0, `${entry.id}: sourceRefs missing`);
  assert.equal(new Set(entry.sourceRefs).size, entry.sourceRefs.length, `${entry.id}: duplicate sourceRef`);
  assert.ok(Array.isArray(entry.evidenceRefs) && entry.evidenceRefs.length > 0, `${entry.id}: evidenceRefs missing`);
  assert.equal(new Set(entry.evidenceRefs).size, entry.evidenceRefs.length, `${entry.id}: duplicate evidenceRef`);

  for (const ref of entry.sourceRefs) {
    assert.equal(path.isAbsolute(ref), false, `${entry.id}: sourceRef must be repo-relative: ${ref}`);
    assert.equal(ref.split('/').includes('..'), false, `${entry.id}: sourceRef may not traverse: ${ref}`);
    assert.equal(fs.existsSync(path.join(root, ref)), true, `${entry.id}: sourceRef does not exist: ${ref}`);
  }
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value] = (out[value] || 0) + 1;
  return out;
}

const computed = {
  cases: registry.cases.length,
  activeCases: registry.cases.filter((entry) => entry.active).length,
  seedCases: registry.cases.filter((entry) => entry.seed).length,
  failureClasses: new Set(registry.cases.map((entry) => entry.failureClass)).size,
  varianceFamilies: new Set(registry.cases.map((entry) => entry.varianceFamily)).size,
  domains: {
    'game-production': 0,
    'factory-reliability': 0,
    ...countBy(registry.cases.map((entry) => entry.domain))
  },
  tiers: {
    '0': 0,
    '1': 0,
    '2': 0,
    ...countBy(registry.cases.map((entry) => String(entry.tier)))
  },
  severity: {
    standard: 0,
    'critical-integrity': 0,
    ...countBy(registry.cases.map((entry) => entry.severity))
  },
  sourceKinds: {
    fixture: 0,
    selftest: 0,
    'historical-regression': 0,
    ...countBy(registry.cases.map((entry) => entry.sourceKind))
  }
};

assert.deepEqual(computed, baseline.counts, 'S0 baseline counts must be a deterministic projection of the registry');
assert.equal(computed.tiers['2'], 0, 'S0 must not claim Tier-2 pipeline simulation coverage before it exists');
assert.equal(registry.cases.every((entry) => entry.tier < 3), true, 'S0 registry must remain zero-paid');

console.log(`GOLDEN CORPUS S0 PASS: ${computed.cases} existing seeds across ${computed.failureClasses} failure classes; game=${computed.domains['game-production']}, factory=${computed.domains['factory-reliability']}, critical=${computed.severity['critical-integrity']}; quality score intentionally deferred to S2.`);
