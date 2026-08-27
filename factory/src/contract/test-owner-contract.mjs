import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createOwnerContract, ownerRequirementIds } from './owner.mjs';

const freeform = [
  'Build a fast arena game.',
  'The player must collect salvage to improve the run.',
  'Never use autoplay.',
  'Maybe add co-op later.'
].join(' ');

const a = createOwnerContract({ idea: freeform, source: 'freeform-selftest' });
const b = createOwnerContract({ idea: freeform, source: 'freeform-selftest' });

assert.equal(a.originalBrief, freeform);
assert.equal(a.ownerBriefSha256, crypto.createHash('sha256').update(freeform).digest('hex'));
assert.equal(a.contractSha256, b.contractSha256);
assert.deepEqual(a.mustHaves.map((r) => r.id), ['MH-01', 'MH-02']);
assert.deepEqual(a.noGos.map((r) => r.id), ['NG-01']);
assert.deepEqual(a.unknowns.map((r) => r.id), ['UN-01']);
assert.deepEqual(ownerRequirementIds(a), ['MH-01', 'MH-02', 'NG-01']);
assert.equal(a.unknowns[0].text, 'Maybe add co-op later.');
assert.equal(a.decomposition.version, 'deterministic-freeform-v1');
assert.equal(Object.isFrozen(a.mustHaves[0].provenance), true);

const ambiguous = createOwnerContract({
  idea: 'Maybe a boss would be cool. Perhaps meta progression later.',
  source: 'adversarial-selftest'
});
assert.equal(ambiguous.mustHaves.length, 0, 'ambiguous free-form text must not be invented as a Must-Have');
assert.equal(ambiguous.noGos.length, 0);
assert.equal(ambiguous.unknowns.length, 2);
assert.deepEqual(ownerRequirementIds(ambiguous), []);

const sectioned = createOwnerContract({
  idea: '## Must-Have\n- A visible boss encounter.\n- Salvage changes gameplay.\n\n## No-Gos\n- No decorative fake upgrades.',
  source: 'section-selftest'
});
assert.deepEqual(sectioned.mustHaves.map((r) => r.id), ['MH-01', 'MH-02']);
assert.deepEqual(sectioned.noGos.map((r) => r.id), ['NG-01']);
assert.equal(sectioned.unknowns.length, 0);

console.log('Owner Contract decomposition selftest: PASS');
