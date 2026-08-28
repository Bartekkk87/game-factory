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
assert.equal(a.decomposition.version, 'deterministic-freeform-v2');
assert.equal(a.decomposition.semanticHeadingContextPreserved, false);
assert.equal(Object.isFrozen(a.mustHaves[0].provenance), true);

const inflatedMood = createOwnerContract({
  idea: 'Baue ein kleines schnelles Sci-Fi Action Game. Es soll sich anfuehlen wie Hotline Miami. Vielleicht mit einem Boss. Inspiriert von Blade Runner.',
  source: 'freeform-inflation-regression'
});
assert.deepEqual(inflatedMood.mustHaves.map((r) => r.text), ['Baue ein kleines schnelles Sci-Fi Action Game.']);
assert.equal(inflatedMood.noGos.length, 0);
assert.deepEqual(inflatedMood.unknowns.map((r) => r.text), [
  'Es soll sich anfuehlen wie Hotline Miami.',
  'Vielleicht mit einem Boss.',
  'Inspiriert von Blade Runner.'
]);
assert.equal(inflatedMood.mustHaves.some((r) => /Hotline Miami|Blade Runner/i.test(r.text)), false);

const explicitConstraint = createOwnerContract({
  idea: 'Das Spiel muss Top-down sein. Dunkle Industrie-Atmosphaere.',
  source: 'freeform-explicit-obligation'
});
assert.deepEqual(explicitConstraint.mustHaves.map((r) => r.text), ['Das Spiel muss Top-down sein.']);
assert.deepEqual(explicitConstraint.unknowns.map((r) => r.text), ['Dunkle Industrie-Atmosphaere.']);

const nonCombat = createOwnerContract({
  idea: 'Create a minimalist puzzle game. It should feel like Monument Valley. Solving a puzzle must increase the score.',
  source: 'non-combat-overfitting-regression'
});
assert.deepEqual(nonCombat.mustHaves.map((r) => r.text), [
  'Create a minimalist puzzle game.',
  'Solving a puzzle must increase the score.'
]);
assert.deepEqual(nonCombat.unknowns.map((r) => r.text), ['It should feel like Monument Valley.']);
assert.equal(nonCombat.mustHaves.some((r) => /camera|combat|boss|lighting|player identity/i.test(r.text)), false);

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

// Package 3 / D-4: generic semantic headings must survive decomposition without
// changing the conservative requirement classification or inventing obligations.
const headingBrief = [
  '## Anchor Moves',
  'Dash through marked lanes to build momentum.',
  '## Signature Risk',
  'Overcharging the dash can leave the player exposed.',
  '## Must Survive The Cut',
  'The upgrade choice must visibly change the next encounter.'
].join('\n');
const headingDriven = createOwnerContract({
  idea: headingBrief,
  source: 'package-3-d4-repair'
});
const headingDrivenAgain = createOwnerContract({
  idea: headingBrief,
  source: 'package-3-d4-repair'
});
assert.equal(headingDriven.contractSha256, headingDrivenAgain.contractSha256);
assert.equal(headingDriven.decomposition.version, 'deterministic-freeform-v3-heading-context');
assert.equal(headingDriven.decomposition.semanticHeadingContextPreserved, true);
assert.deepEqual(headingDriven.mustHaves.map((r) => r.id), ['MH-01']);
assert.deepEqual(headingDriven.unknowns.map((r) => r.id), ['UN-01', 'UN-02']);
assert.equal(headingDriven.mustHaves[0].text, 'The upgrade choice must visibly change the next encounter.');
assert.equal(headingDriven.mustHaves[0].contextHeading, 'Must Survive The Cut');
assert.equal(headingDriven.mustHaves[0].provenance.contextHeading, 'Must Survive The Cut');
assert.equal(headingDriven.unknowns[0].contextHeading, 'Anchor Moves');
assert.equal(headingDriven.unknowns[1].contextHeading, 'Signature Risk');
assert.equal(Object.isFrozen(headingDriven.mustHaves[0]), true);
assert.equal(Object.isFrozen(headingDriven.unknowns[0].provenance), true);

// A forceful-looking heading must not inflate a neutral body sentence into a
// Must-Have. Classification still uses the owner's fragment wording itself.
const noHeadingInflation = createOwnerContract({
  idea: '## Must Survive The Cut\nDistinct silhouettes during combat.',
  source: 'package-3-heading-no-inflation'
});
assert.equal(noHeadingInflation.mustHaves.length, 0);
assert.equal(noHeadingInflation.unknowns.length, 1);
assert.equal(noHeadingInflation.unknowns[0].text, 'Distinct silhouettes during combat.');
assert.equal(noHeadingInflation.unknowns[0].contextHeading, 'Must Survive The Cut');

console.log('PACKAGE 3 D-4 PASS: semantic headings survive as immutable requirement context with stable IDs and no heading-driven obligation inflation.');
console.log('Owner Contract decomposition selftest: PASS');
