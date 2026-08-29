import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as proposal from './proposal-capability.mjs';
import * as privileged from './privileged-lifecycle.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const analysisSource = fs.readFileSync(path.join(here, 'analysis.mjs'), 'utf8');
const orchestrationSource = fs.readFileSync(path.join(here, 'orchestrate.mjs'), 'utf8');

assert.equal(typeof proposal.createCandidateProposal, 'function');
assert.equal(typeof proposal.readCandidate, 'function');
for (const forbidden of ['validateCandidate', 'promoteCandidate', 'deactivateCandidate', 'recordApplicationReceipt']) {
  assert.equal(Object.hasOwn(proposal, forbidden), false, `proposal capability unexpectedly exports ${forbidden}`);
}

for (const required of ['validateCandidate', 'promoteCandidate', 'deactivateCandidate', 'recordApplicationReceipt']) {
  assert.equal(typeof privileged[required], 'function', `privileged lifecycle missing ${required}`);
}

assert.match(analysisSource, /from ['"]\.\/proposal-capability\.mjs['"]/);
assert.doesNotMatch(analysisSource, /from ['"]\.\/(?:privileged-)?lifecycle\.mjs['"]/);
assert.doesNotMatch(orchestrationSource, /from ['"]\.\/(?:privileged-)?lifecycle\.mjs['"]/);
assert.deepEqual(proposal.PROPOSAL_CAPABILITY.may, ['read-candidate', 'create-inactive-candidate']);
assert.equal(proposal.PROPOSAL_CAPABILITY.mustNot.includes('promote-candidate'), true);
assert.equal(privileged.PRIVILEGED_LIFECYCLE_CAPABILITY.mustNot.includes('automatic-analysis'), true);

console.log('learning capability boundary selftest: PASS');
