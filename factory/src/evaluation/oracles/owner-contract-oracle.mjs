import assert from 'node:assert/strict';
import { createOwnerContract } from '../../contract/owner.mjs';

function caseIdFromArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--case' || !args[1]) throw new Error('usage: --case <case-id>');
  return args[1];
}

const headingBrief = [
  '## Anchor Moves',
  'Dash through marked lanes to build momentum.',
  '## Signature Risk',
  'Overcharging the dash can leave the player exposed.',
  '## Must Survive The Cut',
  'The upgrade choice must visibly change the next encounter.'
].join('\n');

const caseId = caseIdFromArgs();
if (caseId === 'gp-owner-heading-context') {
  const contract = createOwnerContract({ idea: headingBrief, source: 'corpus-heading-context' });
  assert.equal(contract.decomposition.semanticHeadingContextPreserved, true);
  assert.equal(contract.mustHaves[0].text, 'The upgrade choice must visibly change the next encounter.');
  assert.equal(contract.mustHaves[0].contextHeading, 'Must Survive The Cut');
  assert.equal(contract.mustHaves[0].provenance.contextHeading, 'Must Survive The Cut');
} else if (caseId === 'gp-owner-heading-unknown-context-preserved') {
  const contract = createOwnerContract({ idea: headingBrief, source: 'corpus-heading-unknown' });
  assert.deepEqual(contract.unknowns.map((entry) => entry.id), ['UN-01', 'UN-02']);
  assert.equal(contract.unknowns[0].contextHeading, 'Anchor Moves');
  assert.equal(contract.unknowns[1].contextHeading, 'Signature Risk');
  assert.equal(Object.isFrozen(contract.unknowns[0].provenance), true);
} else if (caseId === 'gp-owner-ambiguous-no-inflation') {
  const contract = createOwnerContract({ idea: 'Maybe a boss would be cool. Perhaps meta progression later.', source: 'corpus-ambiguous' });
  assert.equal(contract.mustHaves.length, 0);
  assert.equal(contract.noGos.length, 0);
  assert.equal(contract.unknowns.length, 2);
} else if (caseId === 'gp-owner-style-reference-no-inflation') {
  const contract = createOwnerContract({
    idea: 'Baue ein kleines schnelles Sci-Fi Action Game. Es soll sich anfuehlen wie Hotline Miami. Vielleicht mit einem Boss. Inspiriert von Blade Runner.',
    source: 'corpus-style-reference'
  });
  assert.deepEqual(contract.mustHaves.map((entry) => entry.text), ['Baue ein kleines schnelles Sci-Fi Action Game.']);
  assert.deepEqual(contract.unknowns.map((entry) => entry.text), [
    'Es soll sich anfuehlen wie Hotline Miami.',
    'Vielleicht mit einem Boss.',
    'Inspiriert von Blade Runner.'
  ]);
  assert.equal(contract.mustHaves.some((entry) => /Hotline Miami|Blade Runner/i.test(entry.text)), false);
} else {
  throw new Error(`unsupported owner-contract corpus case: ${caseId}`);
}

console.log(JSON.stringify({ caseId, observation: 'PASS' }));
