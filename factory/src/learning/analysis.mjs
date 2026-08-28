import { createCandidate } from './lifecycle.mjs';

export const IMPROVEMENT_AUTHORITY = Object.freeze({
  may: ['propose-scoped-learning-candidate'],
  mustNot: ['validate-candidate','activate-candidate','promote-candidate','activate-production','edit-production','change-own-authority','weaken-release-gates','start-paid-work']
});

export function persistImprovementClaim({ trigger, proposal }) {
  if (!trigger?.allowed) throw new Error('deterministic trigger does not allow improvement analysis');
  if (!trigger.allowedScopes?.includes(proposal.scope)) throw new Error(`proposal scope ${proposal.scope} is outside trigger authority`);
  if (proposal.active === true || proposal.status === 'validated') throw new Error('improvement analysis may only create inactive candidates');
  return createCandidate({ ...proposal, status: 'candidate', active: false });
}
