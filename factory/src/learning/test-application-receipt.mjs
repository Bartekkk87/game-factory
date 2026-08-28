import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const sourceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-s4-application-'));
fs.cpSync(path.join(sourceRoot, 'factory'), path.join(tmp, 'factory'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'memory'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'memory', 'memory.json'), `${JSON.stringify({ products:[], lessons:[], stats:{} }, null, 2)}\n`);

function git(args, { allowFailure=false } = {}) {
  const result = spawnSync('git', args, { cwd:tmp, encoding:'utf8' });
  if (!allowFailure && result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result;
}

function commit(message) {
  git(['add','.']);
  git(['commit','-m',message]);
  return git(['rev-parse','HEAD']).stdout.trim();
}

function shaFile(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(tmp,rel))).digest('hex');
}

function binding(rel) {
  return { ref:rel, sha256:shaFile(rel) };
}

function writeJson(rel, value) {
  const file = path.join(tmp,rel);
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, `${JSON.stringify(value,null,2)}\n`);
}

git(['init','-b','main']);
git(['config','user.email','s4-fixture@example.invalid']);
git(['config','user.name','S4 Fixture']);
commit('fixture base');

const lifecycle = await import(pathToFileURL(path.join(tmp,'factory/src/learning/lifecycle.mjs')));

function create(id, targetLayer='evaluation') {
  return lifecycle.createCandidate({
    id,
    role:'auditor',
    scope:'evaluation-failure-analysis',
    targetLayer,
    text:`S4 fixture ${id}`,
    sourceRunIds:['run-s4-fixture'],
    sourceKind:'s4-fixture',
    ownerFeedbackIds:[],
    createdAt:'2026-08-28T18:00:00Z'
  });
}

function validate(id) {
  return lifecycle.validateCandidate(id,{
    validationEvidence:[{kind:'s4-fixture-review',passed:true}],
    regressionResults:[{suite:'s4-pre-application',passed:true}],
    validatedAt:'2026-08-28T18:05:00Z'
  });
}

create('candidate-s4'); validate('candidate-s4');
create('candidate-s4-supersede'); validate('candidate-s4-supersede');
create('candidate-s4-reversal'); validate('candidate-s4-reversal');
create('candidate-unvalidated');
create('candidate-prompt','prompt'); validate('candidate-prompt');
create('candidate-nonprotected','director'); validate('candidate-nonprotected');
create('candidate-active'); validate('candidate-active');
create('candidate-failed-validation'); validate('candidate-failed-validation');
create('candidate-missing-validation'); validate('candidate-missing-validation');

const activeFile=path.join(tmp,'learning/candidates/candidate-active.json');
const activeRecord=JSON.parse(fs.readFileSync(activeFile,'utf8'));
activeRecord.active=true;
writeJson('learning/candidates/candidate-active.json',activeRecord);
const failedValidationFile=path.join(tmp,'learning/validations/candidate-failed-validation.json');
const failedValidation=JSON.parse(fs.readFileSync(failedValidationFile,'utf8'));
failedValidation.regressionResults=[{suite:'s4-pre-application',passed:false}];
writeJson('learning/validations/candidate-failed-validation.json',failedValidation);
fs.unlinkSync(path.join(tmp,'learning/validations/candidate-missing-validation.json'));

const validatedCandidateCommit=commit('fixture validated candidates');
const tree=git(['rev-parse','HEAD^{tree}']).stdout.trim();
const nonAncestorCommit=spawnSync('git',['commit-tree',tree,'-p',validatedCandidateCommit,'-m','fixture side commit'],{cwd:tmp,encoding:'utf8'});
assert.equal(nonAncestorCommit.status,0,nonAncestorCommit.stderr);
const sideCommit=nonAncestorCommit.stdout.trim();

writeJson('evaluation/s4-protected-fixture.json',{schemaVersion:'s4-protected-fixture-v1',rule:'human-reviewed protected-layer fixture'});
const mergeCommitSha=commit('fixture human-reviewed protected-layer implementation');

const evidenceCandidateIds=[
  'candidate-s4',
  'candidate-s4-supersede',
  'candidate-s4-reversal',
  'candidate-unvalidated',
  'candidate-prompt',
  'candidate-nonprotected',
  'candidate-active',
  'candidate-failed-validation',
  'candidate-missing-validation',
  'candidate-does-not-exist'
];
function regressionRef(id) {
  return `learning/evidence/applications/${id}-full-verifier.json`;
}
for (const id of evidenceCandidateIds) {
  writeJson(regressionRef(id),{
    schemaVersion:lifecycle.APPLICATION_REGRESSION_EVIDENCE_SCHEMA,
    candidateId:id,
    evaluatedCommitSha:mergeCommitSha,
    kind:'full-verifier',
    sourceRef:'fixture-full-verifier',
    outcome:'PASS'
  });
}

function corpusReport(overrides={}) {
  const report={
    schemaVersion:'game-factory.golden-corpus-evaluation-report/v1',
    evaluatedCommitSha:mergeCommitSha,
    baseline:{baselineId:'s4-fixture-baseline',compatibility:{registryBlobMatch:true,s1ManifestBlobMatch:true,compatible:true}},
    metrics:{expectedMismatchCount:0,criticalFalsePassCount:0},
    policy:{corpusRegression:false,criticalFalsePassRegression:false}
  };
  return {
    ...report,
    ...overrides,
    baseline:{...report.baseline,...(overrides.baseline||{}),compatibility:{...report.baseline.compatibility,...(overrides.baseline?.compatibility||{})}},
    metrics:{...report.metrics,...(overrides.metrics||{})},
    policy:{...report.policy,...(overrides.policy||{})}
  };
}
writeJson('evaluation/results/S4-fixture-corpus.json',corpusReport());
commit('fixture post-merge regression and corpus evidence');

const candidateRef='learning/candidates/candidate-s4.json';
const memoryFile=path.join(tmp,'memory/memory.json');
const candidateBefore=fs.readFileSync(path.join(tmp,candidateRef),'utf8');
const memoryBefore=fs.readFileSync(memoryFile,'utf8');

function argsFor(id='candidate-s4',overrides={}) {
  const candidateRel=`learning/candidates/${id}.json`;
  return {
    candidateArtifactSha256:fs.existsSync(path.join(tmp,candidateRel))?shaFile(candidateRel):'0'.repeat(64),
    changeScope:'bounded evaluation-layer fixture change',
    prRef:'#999',
    mergeCommitSha,
    humanApprovalRef:'fixture-human-approval',
    regressionEvidence:[binding(regressionRef(id))],
    corpusEvidence:binding('evaluation/results/S4-fixture-corpus.json'),
    appliedAt:'2026-08-28T18:15:00Z',
    ...overrides
  };
}

// Missing / wrong lifecycle state.
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-does-not-exist',argsFor('candidate-does-not-exist')),/learning candidate missing id/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-unvalidated',argsFor('candidate-unvalidated')),/must be validated and inactive/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-active',argsFor('candidate-active')),/must be validated and inactive/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-prompt',argsFor('candidate-prompt')),/not an S4 non-prompt protected layer/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-nonprotected',argsFor('candidate-nonprotected')),/not an S4 non-prompt protected layer/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{candidateArtifactSha256:'f'.repeat(64)})),/artifact sha256 mismatch/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-missing-validation',argsFor('candidate-missing-validation')),/canonical validation artifact is missing/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-failed-validation',argsFor('candidate-failed-validation')),/canonical validation regression is not fully passing/);

// Human review / implementation provenance.
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{humanApprovalRef:''})),/humanApprovalRef is required/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{prRef:''})),/prRef must identify/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{mergeCommitSha:'bad'})),/full Git commit SHA/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{mergeCommitSha:'1'.repeat(40)})),/merge commit is unknown/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{mergeCommitSha:sideCommit})),/not merged into current HEAD/);

// Evidence completeness, byte binding and semantic post-merge binding.
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[]})),/regressionEvidence is required/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[{ref:'learning/evidence/applications/missing.json',sha256:'0'.repeat(64)}]})),/not found/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[{ref:regressionRef('candidate-s4'),sha256:'0'.repeat(64)}]})),/sha256 mismatch/);
writeJson('learning/evidence/applications/S4-wrong-schema.json',{
  schemaVersion:'wrong-schema',candidateId:'candidate-s4',evaluatedCommitSha:mergeCommitSha,kind:'full-verifier',sourceRef:'fixture',outcome:'PASS'
});
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[binding('learning/evidence/applications/S4-wrong-schema.json')]})),/regression evidence schema is invalid/);
writeJson('learning/evidence/applications/S4-wrong-candidate.json',{
  schemaVersion:lifecycle.APPLICATION_REGRESSION_EVIDENCE_SCHEMA,candidateId:'candidate-other',evaluatedCommitSha:mergeCommitSha,kind:'full-verifier',sourceRef:'fixture',outcome:'PASS'
});
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[binding('learning/evidence/applications/S4-wrong-candidate.json')]})),/regression evidence candidate mismatch/);
writeJson('learning/evidence/applications/S4-wrong-regression-commit.json',{
  schemaVersion:lifecycle.APPLICATION_REGRESSION_EVIDENCE_SCHEMA,candidateId:'candidate-s4',evaluatedCommitSha:validatedCandidateCommit,kind:'full-verifier',sourceRef:'fixture',outcome:'PASS'
});
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[binding('learning/evidence/applications/S4-wrong-regression-commit.json')]})),/regression evidence evaluated a different commit/);
writeJson('learning/evidence/applications/S4-failed-regression.json',{
  schemaVersion:lifecycle.APPLICATION_REGRESSION_EVIDENCE_SCHEMA,candidateId:'candidate-s4',evaluatedCommitSha:mergeCommitSha,kind:'full-verifier',sourceRef:'fixture',outcome:'FAIL'
});
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[binding('learning/evidence/applications/S4-failed-regression.json')]})),/regression evidence outcome must be PASS/);
writeJson('learning/evidence/applications/S4-missing-regression-source.json',{
  schemaVersion:lifecycle.APPLICATION_REGRESSION_EVIDENCE_SCHEMA,candidateId:'candidate-s4',evaluatedCommitSha:mergeCommitSha,kind:'full-verifier',outcome:'PASS'
});
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{regressionEvidence:[binding('learning/evidence/applications/S4-missing-regression-source.json')]})),/regression evidence sourceRef is required/);

writeJson('evaluation/results/S4-wrong-commit.json',corpusReport({evaluatedCommitSha:validatedCandidateCommit}));
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{corpusEvidence:binding('evaluation/results/S4-wrong-commit.json')})),/evaluated a different commit/);
writeJson('evaluation/results/S4-incompatible.json',corpusReport({baseline:{compatibility:{compatible:false}}}));
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{corpusEvidence:binding('evaluation/results/S4-incompatible.json')})),/baseline is incompatible/);
writeJson('evaluation/results/S4-regression.json',corpusReport({policy:{corpusRegression:true}}));
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{corpusEvidence:binding('evaluation/results/S4-regression.json')})),/corpus regression must be false/);
writeJson('evaluation/results/S4-critical-regression.json',corpusReport({policy:{criticalFalsePassRegression:true}}));
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{corpusEvidence:binding('evaluation/results/S4-critical-regression.json')})),/critical false-pass regression must be false/);
writeJson('evaluation/results/S4-mismatch.json',corpusReport({metrics:{expectedMismatchCount:1}}));
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{corpusEvidence:binding('evaluation/results/S4-mismatch.json')})),/expected mismatches must be zero/);
writeJson('evaluation/results/S4-critical-false-pass.json',corpusReport({metrics:{criticalFalsePassCount:1}}));
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{corpusEvidence:binding('evaluation/results/S4-critical-false-pass.json')})),/critical false PASS count must be zero/);

// Prior-receipt references fail closed until the prior receipt exists.
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4-supersede',argsFor('candidate-s4-supersede',{supersedesReceiptId:'application-missing'})),/prior receipt not found/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4-reversal',argsFor('candidate-s4-reversal',{reversalOfReceiptId:'application-missing'})),/prior receipt not found/);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4-supersede',argsFor('candidate-s4-supersede',{supersedesReceiptId:'application-x',reversalOfReceiptId:'application-y'})),/may supersede or reverse/);

// Happy path: durable receipt only; Candidate and active memory stay byte-identical.
const created=lifecycle.recordApplicationReceipt('candidate-s4',argsFor());
assert.equal(created.created,true);
assert.equal(created.schemaVersion,lifecycle.APPLICATION_RECEIPT_SCHEMA);
assert.equal(created.terminalState,lifecycle.APPLICATION_TERMINAL_STATE);
assert.equal(created.candidateId,'candidate-s4');
assert.equal(created.targetLayer,'evaluation');
assert.equal(created.candidateArtifactSha256,shaFile(candidateRef));
assert.equal(created.implementation.mergeCommitSha,mergeCommitSha);
assert.equal(created.regressionEvidence[0].evaluatedCommitSha,mergeCommitSha);
assert.equal(created.regressionEvidence[0].outcome,'PASS');
assert.equal(created.corpusEvidence.evaluatedCommitSha,mergeCommitSha);
assert.equal(created.corpusEvidence.outcome,'PASS');
assert.equal(fs.readFileSync(path.join(tmp,candidateRef),'utf8'),candidateBefore);
assert.equal(fs.readFileSync(memoryFile,'utf8'),memoryBefore);

const receiptFile=path.join(tmp,'learning/applications/candidate-s4.json');
const originalReceiptBytes=fs.readFileSync(receiptFile,'utf8');
const duplicate=lifecycle.recordApplicationReceipt('candidate-s4',argsFor());
assert.equal(duplicate.created,false);
assert.equal(fs.readFileSync(receiptFile,'utf8'),originalReceiptBytes);
assert.throws(()=>lifecycle.recordApplicationReceipt('candidate-s4',argsFor('candidate-s4',{prRef:'#1000'})),/existing receipt is immutable/);
assert.equal(fs.readFileSync(receiptFile,'utf8'),originalReceiptBytes);

// Supersession / reversal create new immutable receipts and never rewrite prior provenance.
const superseded=lifecycle.recordApplicationReceipt('candidate-s4-supersede',argsFor('candidate-s4-supersede',{supersedesReceiptId:'application-candidate-s4',appliedAt:'2026-08-28T18:16:00Z'}));
assert.equal(superseded.supersedesReceiptId,'application-candidate-s4');
assert.equal(fs.readFileSync(receiptFile,'utf8'),originalReceiptBytes);
const reversed=lifecycle.recordApplicationReceipt('candidate-s4-reversal',argsFor('candidate-s4-reversal',{reversalOfReceiptId:'application-candidate-s4',appliedAt:'2026-08-28T18:17:00Z'}));
assert.equal(reversed.reversalOfReceiptId,'application-candidate-s4');
assert.equal(fs.readFileSync(receiptFile,'utf8'),originalReceiptBytes);

// Existing prompt promotion boundary remains unchanged.
assert.throws(()=>lifecycle.promoteCandidate('candidate-prompt',{approvedBy:'model',approvalKind:'model',promotionRef:'fixture'}),/human-merge/);
const promptBefore=fs.readFileSync(path.join(tmp,'learning/candidates/candidate-prompt.json'),'utf8');
const promoted=lifecycle.promoteCandidate('candidate-prompt',{approvedBy:'owner',approvalKind:'human-merge',promotionRef:'fixture-human-promotion',activatedAt:'2026-08-28T18:20:00Z'});
assert.equal(promoted.active,true);
assert.notEqual(fs.readFileSync(path.join(tmp,'learning/candidates/candidate-prompt.json'),'utf8'),promptBefore);
assert.equal(JSON.parse(fs.readFileSync(receiptFile,'utf8')).terminalState,'APPLIED-CLOSED');

console.log('S4 application receipt selftest: PASS');
