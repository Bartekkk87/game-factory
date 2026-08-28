import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'evaluation/corpus/registry.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'evaluation/corpus/s1-cases.json'), 'utf8'));

assert.equal(registry.schemaVersion, 'game-factory.golden-corpus/v1', 'S1 must preserve the frozen S0 registry schema');
assert.equal(registry.status, 'baseline', 'S1 must preserve the frozen S0 registry status');
assert.equal(manifest.schemaVersion, 'game-factory.golden-corpus-s1/v1');
assert.equal(manifest.status, 'active');
assert.equal(manifest.corpusPopulation, 'development-regression');
assert.equal(manifest.executionContract?.runner, 'node-selftest');
assert.equal(manifest.executionContract?.oracle, 'exit-code-zero');
assert.equal(typeof manifest.seedScripts, 'object');
assert.ok(Array.isArray(manifest.variants));

const seeds = registry.cases.filter((entry) => entry.seed);
assert.equal(seeds.length, 15, 'S1 must not replace or relabel the 15 S0 seeds');
const seedById = new Map(seeds.map((entry) => [entry.id, entry]));
assert.equal(seedById.size, seeds.length);

const contractIds = new Set(Object.keys(manifest.seedScripts));
assert.equal(contractIds.size, seeds.length, 'every S0 seed must have exactly one S1a execution contract');
for (const [caseId, script] of Object.entries(manifest.seedScripts)) {
  const seed = seedById.get(caseId);
  assert.ok(seed, `${caseId}: execution contract must resolve to an S0 seed`);
  assert.match(script, /^[A-Za-z0-9._/-]+\.mjs$/, `${caseId}: invalid seed script`);
  assert.equal(path.isAbsolute(script), false, `${caseId}: seed script must be repo-relative`);
  assert.equal(script.split('/').includes('..'), false, `${caseId}: seed script may not traverse`);
  assert.equal(fs.existsSync(path.join(root, script)), true, `${caseId}: seed script does not exist`);
  assert.equal(seed.sourceRefs.includes(script), true, `${caseId}: seed execution script must be a durable sourceRef`);
}
const variantIds = new Set();
for (const variant of manifest.variants) {
  assert.match(variant.id, /^[a-z0-9][a-z0-9-]+$/, `${variant.id}: invalid variant id`);
  assert.equal(seedById.has(variant.id), false, `${variant.id}: variant collides with S0 seed`);
  assert.equal(variantIds.has(variant.id), false, `${variant.id}: duplicate variant id`);
  variantIds.add(variant.id);

  const parent = seedById.get(variant.parentSeedId);
  assert.ok(parent, `${variant.id}: missing parent S0 seed ${variant.parentSeedId}`);
  assert.equal(variant.domain, parent.domain, `${variant.id}: domain differs from parent`);
  assert.equal(variant.failureClass, parent.failureClass, `${variant.id}: failureClass differs from parent`);
  assert.equal(variant.varianceFamily, parent.varianceFamily, `${variant.id}: varianceFamily differs from parent`);
  assert.ok(String(variant.varianceDimension || '').trim(), `${variant.id}: varianceDimension missing`);
  assert.equal(['positive', 'negative'].includes(variant.controlType), true, `${variant.id}: variant must be positive or negative control`);
  assert.equal(variant.expectedOutcome?.caseResult, 'PASS', `${variant.id}: executable variant oracle expects PASS`);
  assert.ok(String(variant.expectedOutcome?.systemBehavior || '').trim(), `${variant.id}: expected system behavior missing`);
  assert.equal(variant.active, true, `${variant.id}: S1 variant must be active`);
  assert.equal([0, 1, 2].includes(variant.tier), true, `${variant.id}: invalid tier`);
  assert.equal(['standard', 'critical-integrity'].includes(variant.severity), true, `${variant.id}: invalid severity`);
  assert.equal(['fixture', 'selftest', 'historical-regression'].includes(variant.sourceKind), true, `${variant.id}: invalid sourceKind`);
  assert.ok(Array.isArray(variant.sourceRefs) && variant.sourceRefs.length > 0, `${variant.id}: sourceRefs missing`);
  assert.equal(new Set(variant.sourceRefs).size, variant.sourceRefs.length, `${variant.id}: duplicate sourceRef`);

  for (const ref of variant.sourceRefs) {
    assert.equal(path.isAbsolute(ref), false, `${variant.id}: sourceRef must be repo-relative: ${ref}`);
    assert.equal(ref.split('/').includes('..'), false, `${variant.id}: sourceRef may not traverse: ${ref}`);
    assert.equal(fs.existsSync(path.join(root, ref)), true, `${variant.id}: sourceRef does not exist: ${ref}`);
  }

  assert.match(variant.script || '', /^[A-Za-z0-9._/-]+\.mjs$/, `${variant.id}: invalid variant script`);
  assert.equal(variant.sourceRefs.includes(variant.script), true, `${variant.id}: variant execution script must be a durable sourceRef`);
  assert.equal(fs.existsSync(path.join(root, variant.script)), true, `${variant.id}: variant execution script does not exist`);
  assert.ok(String(variant.rationale || '').trim(), `${variant.id}: rationale missing`);
}

const seedFailureClasses = new Set(seeds.map((entry) => entry.failureClass));
const seedFamilies = new Set(seeds.map((entry) => entry.varianceFamily));
const variantFailureClasses = new Set(manifest.variants.map((entry) => entry.failureClass));
const variantFamilies = new Set(manifest.variants.map((entry) => entry.varianceFamily));

for (const failureClass of seedFailureClasses) {
  assert.equal(variantFailureClasses.has(failureClass), true, `S1 sibling missing for failure class: ${failureClass}`);
}
for (const family of seedFamilies) {
  assert.equal(variantFamilies.has(family), true, `S1 sibling missing for variance family: ${family}`);
}

assert.equal(manifest.variants.length, seedFailureClasses.size, 'S1b intentionally adds one bounded sibling per registered failure class');
assert.equal(manifest.variants.every((entry) => entry.tier < 3), true, 'S1 variants must remain zero-paid');
assert.equal(manifest.corpusPopulation, 'development-regression', 'S1 must not claim holdout/generalization coverage');

console.log(
  `GOLDEN CORPUS S1 PASS: ${seeds.length} frozen S0 seeds have executable S1a contracts; ` +
  `${manifest.variants.length} bounded development/regression siblings cover ${seedFailureClasses.size} failure classes / ${seedFamilies.size} variance families; ` +
  'no S2 score or holdout claim is introduced.'
);
