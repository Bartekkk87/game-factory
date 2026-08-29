import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyPatchToStaging } from './patch-contract.mjs';
import { loadProjectManifest } from './manifest.mjs';
import { loadProjectState, nextVerifiedState, writeProjectStateAtomic } from './project-state.mjs';
import { createVerificationPlan, evaluateVerificationResults } from './verification-plan.mjs';
import { PROJECT_EVIDENCE_SCHEMA, sha256, validateTaskContract } from './contracts.mjs';

function transactionRoot(projectRoot) {
  const root = path.resolve(projectRoot);
  return path.join(path.dirname(root), `.${path.basename(root)}.transactions`);
}

function writeJournal(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temp, file);
}

export function recoverProjectTransactions(projectRoot) {
  const root = path.resolve(projectRoot);
  const journals = transactionRoot(root);
  const recovered = [];
  if (!fs.existsSync(journals)) return recovered;
  for (const entry of fs.readdirSync(journals).filter((name) => name.endsWith('.json')).sort()) {
    const journalFile = path.join(journals, entry);
    const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8'));
    const staging = path.resolve(journal.staging);
    const backup = path.resolve(journal.backup);
    if (journal.phase === 'committed') {
      fs.rmSync(backup, { recursive: true, force: true });
      fs.rmSync(staging, { recursive: true, force: true });
    } else if (fs.existsSync(backup)) {
      if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
      fs.renameSync(backup, root);
      fs.rmSync(staging, { recursive: true, force: true });
    } else {
      fs.rmSync(staging, { recursive: true, force: true });
    }
    fs.rmSync(journalFile, { force: true });
    recovered.push({ id: journal.id, action: journal.phase === 'committed' ? 'completed-cleanup' : 'rolled-back' });
  }
  return recovered;
}

export function prepareTaskTransaction({ projectRoot, task, operations } = {}) {
  const root = path.resolve(projectRoot);
  recoverProjectTransactions(root);
  const manifest = loadProjectManifest(root);
  const checkedTask = validateTaskContract(task, manifest);
  const id = `${checkedTask.taskId}-${crypto.randomUUID()}`;
  const txRoot = transactionRoot(root);
  const staging = path.join(txRoot, `${id}.staging`);
  const backup = path.join(txRoot, `${id}.backup`);
  const journalFile = path.join(txRoot, `${id}.json`);
  fs.mkdirSync(txRoot, { recursive: true });
  fs.cpSync(root, staging, { recursive: true, errorOnExist: true });
  let patchEvidence;
  try {
    patchEvidence = applyPatchToStaging({ projectRoot: staging, task: checkedTask, operations, manifest });
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  const journal = { schemaVersion: 'project-game.transaction/v1', id, taskId: checkedTask.taskId, projectRoot: root, staging, backup, phase: 'prepared' };
  writeJournal(journalFile, journal);
  return Object.freeze({ id, projectRoot: root, staging, backup, journalFile, manifest, task: checkedTask, patchEvidence });
}

export function abortTaskTransaction(transaction, reason = 'verification-failed') {
  fs.rmSync(transaction.staging, { recursive: true, force: true });
  fs.rmSync(transaction.backup, { recursive: true, force: true });
  fs.rmSync(transaction.journalFile, { force: true });
  return { status: 'aborted', reason, baselinePromoted: false };
}

export function commitVerifiedTransaction(transaction, {
  verificationResults,
  modelEvidence,
  operationEvidence,
  capabilities = [],
  regressions = [],
  saveSchemaVersion = null,
  buildVersion = null,
  verifiedAt = new Date().toISOString()
} = {}) {
  const currentState = loadProjectState(transaction.staging, transaction.manifest.projectId);
  if (currentState.baseline && currentState.baseline.treeSha256 !== transaction.patchEvidence.baselineBefore) {
    return abortTaskTransaction(transaction, 'baseline-drift');
  }
  const plan = createVerificationPlan({ manifest: transaction.manifest, task: transaction.task, projectState: currentState });
  const verification = evaluateVerificationResults(plan, verificationResults);
  if (!verification.pass) return abortTaskTransaction(transaction, 'verification-failed');
  if (!modelEvidence || typeof modelEvidence !== 'object' || !modelEvidence.provider || !modelEvidence.actualModel || !modelEvidence.operation) {
    return abortTaskTransaction(transaction, 'model-evidence-missing');
  }
  if (!operationEvidence || typeof operationEvidence !== 'object' || !operationEvidence.operation || !operationEvidence.context?.selectionSha256) {
    return abortTaskTransaction(transaction, 'operation-evidence-missing');
  }
  const evidence = {
    schemaVersion: PROJECT_EVIDENCE_SCHEMA,
    projectId: transaction.manifest.projectId,
    taskId: transaction.task.taskId,
    taskContractSha256: transaction.task.contractSha256,
    manifestSha256: transaction.manifest.contractSha256,
    model: modelEvidence,
    operation: operationEvidence,
    context: operationEvidence.context,
    filesChanged: transaction.patchEvidence.filesChanged,
    baselineBefore: transaction.patchEvidence.baselineBefore,
    baselineAfter: transaction.patchEvidence.candidateAfter,
    verification,
    result: 'PASS',
    verifiedAt
  };
  const evidenceText = `${JSON.stringify(evidence, null, 2)}\n`;
  const evidenceSha256 = sha256(Buffer.from(evidenceText));
  const evidenceDir = path.join(transaction.staging, '.factory', 'evidence', transaction.task.taskId);
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, `${transaction.id}.json`), evidenceText);
  const nextState = nextVerifiedState(currentState, {
    task: transaction.task,
    patchEvidence: transaction.patchEvidence,
    evidenceSha256,
    verifiedAt,
    capabilities,
    regressions,
    saveSchemaVersion,
    buildVersion
  });
  writeProjectStateAtomic(transaction.staging, nextState);

  writeJournal(transaction.journalFile, {
    schemaVersion: 'project-game.transaction/v1',
    id: transaction.id,
    taskId: transaction.task.taskId,
    projectRoot: transaction.projectRoot,
    staging: transaction.staging,
    backup: transaction.backup,
    phase: 'swapping'
  });
  fs.renameSync(transaction.projectRoot, transaction.backup);
  fs.renameSync(transaction.staging, transaction.projectRoot);
  writeJournal(transaction.journalFile, {
    schemaVersion: 'project-game.transaction/v1',
    id: transaction.id,
    taskId: transaction.task.taskId,
    projectRoot: transaction.projectRoot,
    staging: transaction.staging,
    backup: transaction.backup,
    phase: 'committed'
  });
  fs.rmSync(transaction.backup, { recursive: true, force: true });
  fs.rmSync(transaction.journalFile, { force: true });
  return Object.freeze({ status: 'committed', baselinePromoted: true, evidenceSha256, verification, state: nextState });
}
