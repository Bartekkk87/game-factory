import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { aggregateEvidence } from './aggregate.mjs';
import { evaluateImprovementTrigger, TRIGGER_POLICY_VERSION } from './trigger.mjs';
import { IMPROVEMENT_AUTHORITY } from './analysis.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-learning-'));
fs.cpSync(path.join(root, 'factory'), path.join(tmp, 'factory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'memory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'drafts', 'fixture'), { recursive: true });
const candidateHtml='<!doctype html><title>fixture</title>';
fs.writeFileSync(path.join(tmp,'drafts/fixture/index.html'),candidateHtml);
const candidateSha=crypto.createHash('sha256').update(candidateHtml).digest('hex');
fs.writeFileSync(path.join(tmp,'drafts/fixture/meta.json'),JSON.stringify({slug:'fixture',title:'Fixture',status:'awaiting-review',candidateSha,overall:7,date:'2026-08-27',runId:'run-1'},null,2));

const store=await import(pathToFileURL(path.join(tmp,'factory/src/memory/store.mjs')));
const owner=await import(pathToFileURL(path.join(tmp,'factory/src/learning/owner-feedback.mjs')));
const lifecycle=await import(pathToFileURL(path.join(tmp,'factory/src/learning/lifecycle.mjs')));
const analysis=await import(pathToFileURL(path.join(tmp,'factory/src/learning/analysis.mjs')));
fs.writeFileSync(path.join(tmp,'memory/memory.json'),JSON.stringify({products:[],lessons:[
  {role:'director',text:'legacy'},
  {role:'director',text:'candidate',status:'candidate',active:false},
  {role:'director',text:'validated inactive',status:'validated',active:false},
  {role:'director',text:'validated active',status:'validated',active:true}
],stats:{}},null,2));
assert.deepEqual(store.lessonsFor('director'),['- validated active']);
assert.equal(store.loadMemory().lessons[0].status,'legacy-unvalidated');
assert.equal(store.loadMemory().lessons[0].active,false);

const raw='/reject First line\nSecond line with  two spaces\nThird line\nFourth line is preserved';
const captured=owner.captureOwnerFeedback({issueNumber:6,commentId:6001,issueUrl:'https://example.invalid/issues/6',commentUrl:'https://example.invalid/issues/6#comment-6001',author:'owner',rawText:raw,slug:'fixture',createdAt:'2026-08-27T12:00:00Z'});
assert.equal(captured.record.rawText,raw);
assert.equal(captured.record.parsedReason,'First line\nSecond line with  two spaces\nThird line\nFourth line is preserved');
assert.deepEqual(captured.record.sourceRunIds,['run-1']);
assert.equal(captured.record.candidateSha,candidateSha);
assert.equal(owner.captureOwnerFeedback({issueNumber:6,commentId:6001,rawText:raw,slug:'fixture',createdAt:'2026-08-27T12:00:00Z'}).created,false);

const reject=spawnSync(process.execPath,['factory/src/publish/finalize.mjs','--slug','fixture','--action','reject','--reason',captured.record.parsedReason],{cwd:tmp,encoding:'utf8'});
assert.equal(reject.status,0,reject.stderr);
assert.equal(store.loadMemory().lessons.some((l)=>l.text?.includes('Owner rejected')),false);

const evidence={runEvidence:[
  {runId:'run-2',repairCount:1,events:[{failureSignature:'E1'}],llmCalls:[{role:'engineer',operation:'repair',model:'m',costUsd:0.2,tokens:10}]},
  {runId:'run-1',repairCount:1,events:[{failureSignature:'E1'}],llmCalls:[{role:'engineer',operation:'build',model:'m',costUsd:0.1,tokens:5}]}
],ownerFeedback:[{id:captured.record.id,parsedCommand:'reject',classificationClaims:[{type:'visual-reference-mismatch'}]}]};
const aggregate1=aggregateEvidence(evidence),aggregate2=aggregateEvidence(evidence);
assert.equal(JSON.stringify(aggregate1),JSON.stringify(aggregate2));
const trigger1=evaluateImprovementTrigger(aggregate1),trigger2=evaluateImprovementTrigger(aggregate1);
assert.deepEqual(trigger1,trigger2);assert.equal(trigger1.policyVersion,TRIGGER_POLICY_VERSION);assert.equal(trigger1.allowed,true);assert.equal(trigger1.canValidate,false);assert.equal(trigger1.canActivate,false);assert.ok(IMPROVEMENT_AUTHORITY.mustNot.includes('activate-production'));

const c=lifecycle.createCandidate({id:'candidate-fixture',role:'director',scope:'product-feedback',targetLayer:'prompt',text:'Scoped test candidate',sourceRunIds:['run-1'],sourceKind:'owner-feedback',ownerFeedbackIds:[captured.record.id],candidateSha,confidence:0.5,evidenceCount:1,createdAt:'2026-08-27T12:10:00Z'});
assert.equal(c.status,'candidate');assert.equal(c.active,false);assert.equal(store.lessonsFor('director').includes('- Scoped test candidate'),false);
const proposed=analysis.persistImprovementClaim({trigger:trigger1,proposal:{id:'candidate-analysis',role:'director',scope:'product-feedback',targetLayer:'director',text:'Analysis claim',sourceRunIds:['run-1'],sourceKind:'owner-feedback',ownerFeedbackIds:[captured.record.id],createdAt:'2026-08-27T12:11:00Z'}});
assert.equal(proposed.active,false);assert.equal(proposed.status,'candidate');
const validated=lifecycle.validateCandidate('candidate-fixture',{validationEvidence:[{kind:'fixture',passed:true}],regressionResults:[{suite:'learning',passed:true}],validatedAt:'2026-08-27T12:20:00Z'});
assert.equal(validated.status,'validated');assert.equal(validated.active,false);assert.equal(store.lessonsFor('director').includes('- Scoped test candidate'),false);
assert.throws(()=>lifecycle.promoteCandidate('candidate-fixture',{approvedBy:'model',approvalKind:'model',promotionRef:'not-human'}),/human-merge/);
const active=lifecycle.promoteCandidate('candidate-fixture',{approvedBy:'owner',approvalKind:'human-merge',promotionRef:'pr-test',activatedAt:'2026-08-27T12:30:00Z'});
assert.equal(active.active,true);assert.equal(store.lessonsFor('director').includes('- Scoped test candidate'),true);
const deactivated=lifecycle.deactivateCandidate('candidate-fixture',{by:'owner',reason:'rollback test',at:'2026-08-27T12:40:00Z'});
assert.equal(deactivated.active,false);assert.equal(store.lessonsFor('director').includes('- Scoped test candidate'),false);
console.log('controlled learning selftest: PASS');
