import path from 'node:path';
import { ROOT } from '../config.mjs';
import { readJson, writeJson } from '../util/fsx.mjs';
import { loadMemory, saveMemory } from '../memory/store.mjs';

export const LEARNING_SCHEMA = 'learning-candidate-v1';
export const PROTECTED_LAYERS = Object.freeze(new Set(['skill','prompt','owner-contract','verifier','product-fidelity','release-gate','engine-contract','control-plane']));
const DIRS = Object.freeze({ candidates: path.join(ROOT,'learning','candidates'), validations: path.join(ROOT,'learning','validations'), promotions: path.join(ROOT,'learning','promotions') });
const candidatePath = (id) => path.join(DIRS.candidates, `${id}.json`);

export function assertCandidate(c) {
  for (const key of ['id','status','role','scope','targetLayer','text','sourceKind','createdAt']) if (!c?.[key]) throw new Error(`learning candidate missing ${key}`);
  if (!Array.isArray(c.sourceRunIds) || !c.sourceRunIds.length) throw new Error('learning candidate requires sourceRunIds');
  if (!Array.isArray(c.ownerFeedbackIds)) throw new Error('learning candidate ownerFeedbackIds must be an array');
  if (c.active === true && c.status !== 'validated') throw new Error('only validated candidates may be active');
  return c;
}

export function createCandidate(input) {
  const c = assertCandidate({ schemaVersion: LEARNING_SCHEMA, id: input.id, status:'candidate', role:input.role, scope:input.scope, targetLayer:input.targetLayer, text:input.text,
    sourceRunIds:[...new Set(input.sourceRunIds||[])].map(String).sort(), sourceKind:input.sourceKind, ownerFeedbackIds:[...new Set(input.ownerFeedbackIds||[])].map(String).sort(),
    candidateSha:input.candidateSha||null, confidence:Number.isFinite(Number(input.confidence))?Number(input.confidence):null, evidenceCount:Number.isFinite(Number(input.evidenceCount))?Number(input.evidenceCount):0,
    createdAt:input.createdAt||new Date().toISOString(), validatedAt:null, expiresAfter:input.expiresAfter||null, supersedes:input.supersedes||null, validationEvidence:[], regressionResults:[], active:false,
    activatedAt:null, promotionRef:null, deactivatedAt:null, deactivatedBy:null, rollbackOf:null, reversalReason:null });
  if (readJson(candidatePath(c.id), null)) throw new Error(`candidate already exists: ${c.id}`);
  writeJson(candidatePath(c.id), c); return c;
}

export function validateCandidate(id,{validationEvidence,regressionResults,validatedAt=null}) {
  const c=assertCandidate(readJson(candidatePath(id),null));
  if(c.status!=='candidate') throw new Error(`candidate ${id} is not pending validation`);
  if(!Array.isArray(validationEvidence)||!validationEvidence.length) throw new Error('validationEvidence is required');
  if(!Array.isArray(regressionResults)||!regressionResults.length||regressionResults.some(r=>r?.passed!==true)) throw new Error('all regression results must pass');
  const next={...c,status:'validated',validatedAt:validatedAt||new Date().toISOString(),validationEvidence,regressionResults,active:false};
  writeJson(candidatePath(id),next); writeJson(path.join(DIRS.validations,`${id}.json`),{schemaVersion:'learning-validation-v1',candidateId:id,validatedAt:next.validatedAt,validationEvidence,regressionResults,outcome:'validated-inactive'}); return next;
}

export function promoteCandidate(id,{approvedBy,approvalKind,promotionRef,activatedAt=null}) {
  const c=assertCandidate(readJson(candidatePath(id),null));
  if(c.status!=='validated'||c.active) throw new Error(`candidate ${id} must be validated and inactive`);
  if(!approvedBy||!promotionRef) throw new Error('promotion requires approvedBy and promotionRef');
  if(PROTECTED_LAYERS.has(c.targetLayer)&&approvalKind!=='human-merge') throw new Error(`protected layer ${c.targetLayer} requires human-merge promotion`);
  const at=activatedAt||new Date().toISOString();
  writeJson(path.join(DIRS.promotions,`${id}.json`),{schemaVersion:'learning-promotion-v1',candidateId:id,approvedBy,approvalKind,promotionRef,activatedAt:at,reversible:true});
  const next={...c,active:true,activatedAt:at,promotionRef}; writeJson(candidatePath(id),next);
  const m=loadMemory(); if(!m.lessons.some(l=>l.id===id)){m.lessons.push({id,date:at.slice(0,10),role:c.role,text:c.text,status:'validated',active:true,sourceKind:c.sourceKind,sourceRunIds:c.sourceRunIds,ownerFeedbackIds:c.ownerFeedbackIds,targetLayer:c.targetLayer,promotionRef});saveMemory(m);} return next;
}

export function deactivateCandidate(id,{by,reason,rollbackOf=null,at=null}) {
  const c=assertCandidate(readJson(candidatePath(id),null)); const when=at||new Date().toISOString();
  const next={...c,active:false,deactivatedAt:when,deactivatedBy:by||null,rollbackOf:rollbackOf||c.rollbackOf||null,reversalReason:reason||null}; writeJson(candidatePath(id),next);
  const m=loadMemory(); m.lessons=m.lessons.map(l=>l.id===id?{...l,active:false,deactivatedAt:when,reversalReason:reason||null}:l); saveMemory(m); return next;
}
