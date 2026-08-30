import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyPatchToStaging } from './patch-contract.mjs';
import { captureProjectTree } from './file-state.mjs';
import { loadProjectManifest } from './manifest.mjs';
import { loadProjectState, nextVerifiedState, writeProjectStateAtomic } from './project-state.mjs';
import { createVerificationPlan, deriveVerifiedProjectRecords } from './verification-plan.mjs';
import { evaluateVerificationExecution, runVerificationPlan } from './verification-runner.mjs';
import {
  PROJECT_EVIDENCE_SCHEMA,
  assertSafeId,
  assertSha256,
  sha256,
  validateTaskContract
} from './contracts.mjs';
import { assertAuthorizedMutationRoot, authorizeProjectWorkspace } from './workspace-boundary.mjs';

const TRANSACTION_SCHEMA = 'project-game.transaction/v1';
const LOCK_SCHEMA = 'project-game.transaction-lock/v1';
const TRANSACTION_TOKEN = Symbol('project-game-transaction');
const JOURNAL_PHASES = new Set(['preparing', 'prepared', 'swapping', 'committed']);
const JOURNAL_KEYS = Object.freeze([
  'baselineBefore',
  'candidateAfter',
  'id',
  'manifestSha256',
  'phase',
  'projectId',
  'projectRoot',
  'schemaVersion',
  'taskId'
]);

function transactionRoot(projectRoot) {
  const root = path.resolve(projectRoot);
  return path.join(path.dirname(root), `.${path.basename(root)}.transactions`);
}

function transactionPaths(projectRoot, id) {
  const root = path.resolve(projectRoot);
  const checkedId = assertSafeId(id, 'transaction.id');
  const txRoot = transactionRoot(root);
  return Object.freeze({
    root,
    txRoot,
    staging: path.join(txRoot, `${checkedId}.staging`),
    backup: path.join(txRoot, `${checkedId}.backup`),
    journalFile: path.join(txRoot, `${checkedId}.json`),
    lockFile: path.join(txRoot, '.lock.json')
  });
}

function treeOptions(manifest) {
  return {
    excludes: [
      manifest.layout.buildDir,
      '.factory/evidence',
      '.factory/verification',
      '.factory/project-state.json',
      '.factory/transactions'
    ]
  };
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
}

function journalValue({ id, taskId, projectRoot, manifest, patchEvidence, phase }) {
  return {
    schemaVersion: TRANSACTION_SCHEMA,
    id,
    taskId,
    projectId: manifest.projectId,
    manifestSha256: manifest.contractSha256,
    projectRoot: path.resolve(projectRoot),
    baselineBefore: patchEvidence?.baselineBefore || null,
    candidateAfter: patchEvidence?.candidateAfter || null,
    phase
  };
}

function writeJournal(transaction, phase) {
  if (!JOURNAL_PHASES.has(phase)) throw new Error(`transaction journal phase invalid: ${phase}`);
  writeJsonAtomic(transaction.journalFile, journalValue({ ...transaction, phase }));
}

function validateJournal(raw, { projectRoot, entry }) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`transaction journal invalid: ${entry}`);
  const keys = Object.keys(raw).sort();
  if (JSON.stringify(keys) !== JSON.stringify(JOURNAL_KEYS)) throw new Error(`transaction journal fields invalid: ${entry}`);
  if (raw.schemaVersion !== TRANSACTION_SCHEMA) throw new Error(`transaction journal schema invalid: ${entry}`);
  const id = assertSafeId(raw.id, 'transaction journal id');
  if (entry !== `${id}.json`) throw new Error(`transaction journal filename mismatch: ${entry}`);
  const taskId = assertSafeId(raw.taskId, 'transaction journal taskId');
  const projectId = assertSafeId(raw.projectId, 'transaction journal projectId');
  const manifestSha256 = assertSha256(raw.manifestSha256, 'transaction journal manifestSha256');
  const root = path.resolve(projectRoot);
  if (path.resolve(raw.projectRoot) !== root) throw new Error(`transaction journal project mismatch: ${entry}`);
  if (!JOURNAL_PHASES.has(raw.phase)) throw new Error(`transaction journal phase invalid: ${entry}`);
  const requiresTreeIdentity = raw.phase !== 'preparing';
  const baselineBefore = requiresTreeIdentity
    ? assertSha256(raw.baselineBefore, 'transaction journal baselineBefore')
    : null;
  const candidateAfter = requiresTreeIdentity
    ? assertSha256(raw.candidateAfter, 'transaction journal candidateAfter')
    : null;
  if (!requiresTreeIdentity && (raw.baselineBefore !== null || raw.candidateAfter !== null)) {
    throw new Error(`preparing transaction journal has premature tree identity: ${entry}`);
  }
  return Object.freeze({
    id,
    taskId,
    projectId,
    manifestSha256,
    projectRoot: root,
    baselineBefore,
    candidateAfter,
    phase: raw.phase
  });
}

function validateJournalTree(projectRoot, journal, expectedTreeSha256) {
  const manifest = loadProjectManifest(projectRoot);
  if (manifest.projectId !== journal.projectId || manifest.contractSha256 !== journal.manifestSha256) {
    throw new Error(`transaction journal workspace identity mismatch: ${journal.id}`);
  }
  const actual = captureProjectTree(projectRoot, treeOptions(manifest));
  if (actual.treeSha256 !== expectedTreeSha256) {
    throw new Error(`transaction journal workspace tree mismatch: ${journal.id}`);
  }
}

function readLock(lockFile, projectRoot) {
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  } catch (error) {
    throw new Error(`project transaction lock is unreadable: ${error.message}`);
  }
  if (lock?.schemaVersion !== LOCK_SCHEMA
    || path.resolve(lock.projectRoot || '') !== path.resolve(projectRoot)
    || !Number.isInteger(lock.pid)
    || lock.pid < 1) {
    throw new Error('project transaction lock is invalid');
  }
  assertSafeId(lock.id, 'transaction lock id');
  return lock;
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    return true;
  }
}

function acquireProjectLock(projectRoot) {
  const root = path.resolve(projectRoot);
  const txRoot = transactionRoot(root);
  const lockFile = path.join(txRoot, '.lock.json');
  fs.mkdirSync(txRoot, { recursive: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = crypto.randomUUID();
    try {
      const fd = fs.openSync(lockFile, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, `${JSON.stringify({
          schemaVersion: LOCK_SCHEMA,
          id,
          projectRoot: root,
          pid: process.pid,
          acquiredAt: new Date().toISOString()
        }, null, 2)}\n`);
      } finally {
        fs.closeSync(fd);
      }
      return Object.freeze({ id, file: lockFile });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const existing = readLock(lockFile, root);
      if (processIsAlive(existing.pid)) throw new Error(`project transaction locked by pid ${existing.pid}`);
      fs.rmSync(lockFile, { force: true });
    }
  }
  throw new Error('project transaction lock could not be acquired');
}

function assertLockOwned(projectRoot, lock) {
  const current = readLock(lock.file, projectRoot);
  if (current.id !== lock.id || current.pid !== process.pid) throw new Error('project transaction lock ownership lost');
}

function releaseProjectLock(projectRoot, lock) {
  assertLockOwned(projectRoot, lock);
  fs.rmSync(lock.file, { force: true });
}

function recoverLocked(projectRoot) {
  const root = path.resolve(projectRoot);
  const journals = transactionRoot(root);
  const recovered = [];
  if (!fs.existsSync(journals)) return recovered;
  for (const entry of fs.readdirSync(journals).filter((name) => name.endsWith('.json') && name !== '.lock.json').sort()) {
    const journalFile = path.join(journals, entry);
    const journal = validateJournal(JSON.parse(fs.readFileSync(journalFile, 'utf8')), { projectRoot: root, entry });
    const paths = transactionPaths(root, journal.id);
    if (journal.phase === 'committed') {
      if (!fs.existsSync(root)) throw new Error(`committed transaction project root missing: ${journal.id}`);
      validateJournalTree(root, journal, journal.candidateAfter);
      fs.rmSync(paths.backup, { recursive: true, force: true });
      fs.rmSync(paths.staging, { recursive: true, force: true });
      recovered.push({ id: journal.id, action: 'completed-cleanup' });
    } else if (journal.phase === 'swapping' && fs.existsSync(paths.backup)) {
      validateJournalTree(paths.backup, journal, journal.baselineBefore);
      if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
      fs.renameSync(paths.backup, root);
      fs.rmSync(paths.staging, { recursive: true, force: true });
      recovered.push({ id: journal.id, action: 'rolled-back' });
    } else if (journal.phase === 'swapping') {
      if (!fs.existsSync(root)) throw new Error(`transaction recovery has no baseline: ${journal.id}`);
      validateJournalTree(root, journal, journal.baselineBefore);
      fs.rmSync(paths.staging, { recursive: true, force: true });
      recovered.push({ id: journal.id, action: 'rolled-back' });
    } else {
      if (fs.existsSync(paths.backup)) throw new Error(`unexpected transaction backup before swap: ${journal.id}`);
      if (!fs.existsSync(root)) throw new Error(`transaction recovery baseline missing: ${journal.id}`);
      if (journal.phase === 'prepared') {
        validateJournalTree(root, journal, journal.baselineBefore);
      } else {
        const manifest = loadProjectManifest(root);
        if (manifest.projectId !== journal.projectId || manifest.contractSha256 !== journal.manifestSha256) {
          throw new Error(`transaction journal project authority mismatch: ${journal.id}`);
        }
      }
      fs.rmSync(paths.staging, { recursive: true, force: true });
      recovered.push({ id: journal.id, action: 'rolled-back' });
    }
    fs.rmSync(journalFile, { force: true });
  }
  return recovered;
}

export function recoverProjectTransactions(projectRoot) {
  const root = path.resolve(projectRoot);
  const lock = acquireProjectLock(root);
  try {
    return recoverLocked(root);
  } finally {
    releaseProjectLock(root, lock);
  }
}

function checkedTransaction(transaction) {
  if (!transaction?.[TRANSACTION_TOKEN]) throw new Error('project transaction handle invalid');
  assertAuthorizedMutationRoot(transaction.projectRoot, transaction.workspaceAuthority);
  const paths = transactionPaths(transaction.projectRoot, transaction.id);
  if (paths.staging !== transaction.staging
    || paths.backup !== transaction.backup
    || paths.journalFile !== transaction.journalFile) {
    throw new Error('project transaction paths invalid');
  }
  assertLockOwned(transaction.projectRoot, transaction.lock);
  return transaction;
}

export function prepareTaskTransaction({ projectRoot, task, operations } = {}) {
  const preliminaryTask = validateTaskContract(task);
  const workspaceAuthority = authorizeProjectWorkspace({
    projectRoot,
    projectId: preliminaryTask.projectId
  });
  const root = workspaceAuthority.projectRoot;
  const lock = acquireProjectLock(root);
  let transaction = null;
  try {
    recoverLocked(root);
    const manifest = loadProjectManifest(root);
    const checkedTask = validateTaskContract(preliminaryTask, manifest);
    const id = crypto.randomUUID();
    const paths = transactionPaths(root, id);
    transaction = {
      [TRANSACTION_TOKEN]: true,
      id,
      taskId: checkedTask.taskId,
      projectRoot: root,
      staging: paths.staging,
      backup: paths.backup,
      journalFile: paths.journalFile,
      lock,
      manifest,
      task: checkedTask,
      workspaceAuthority,
      patchEvidence: null
    };
    writeJournal(transaction, 'preparing');
    fs.cpSync(root, paths.staging, { recursive: true, errorOnExist: true });
    transaction.patchEvidence = applyPatchToStaging({
      projectRoot: paths.staging,
      task: checkedTask,
      operations,
      manifest,
      workspaceAuthority
    });
    writeJournal(transaction, 'prepared');
    return Object.freeze(transaction);
  } catch (error) {
    if (transaction) {
      fs.rmSync(transaction.staging, { recursive: true, force: true });
      fs.rmSync(transaction.backup, { recursive: true, force: true });
      fs.rmSync(transaction.journalFile, { force: true });
    }
    releaseProjectLock(root, lock);
    throw error;
  }
}

export function abortTaskTransaction(transaction, reason = 'verification-failed', details = {}) {
  const checked = checkedTransaction(transaction);
  fs.rmSync(checked.staging, { recursive: true, force: true });
  fs.rmSync(checked.backup, { recursive: true, force: true });
  fs.rmSync(checked.journalFile, { force: true });
  releaseProjectLock(checked.projectRoot, checked.lock);
  return { status: 'aborted', reason, baselinePromoted: false, ...details };
}

function validateCommitEvidence(options) {
  if (!options.modelEvidence || typeof options.modelEvidence !== 'object'
    || !options.modelEvidence.provider || !options.modelEvidence.actualModel || !options.modelEvidence.operation) {
    return 'model-evidence-missing';
  }
  if (!options.operationEvidence || typeof options.operationEvidence !== 'object'
    || !options.operationEvidence.operation || !options.operationEvidence.context?.selectionSha256) {
    return 'operation-evidence-missing';
  }
  return null;
}

export function commitVerifiedTransaction(transaction, options = {}) {
  const checked = checkedTransaction(transaction);
  for (const forbidden of ['verificationResults', 'capabilities', 'regressions']) {
    if (Object.hasOwn(options, forbidden)) {
      return abortTaskTransaction(checked, `caller-supplied-${forbidden}-forbidden`);
    }
  }
  const evidenceError = validateCommitEvidence(options);
  if (evidenceError) return abortTaskTransaction(checked, evidenceError);

  let currentState;
  try {
    currentState = loadProjectState(checked.staging, checked.manifest.projectId, { create: false });
  } catch (error) {
    return abortTaskTransaction(checked, 'project-state-invalid', { detail: String(error.message || error) });
  }
  if (currentState.baseline && currentState.baseline.treeSha256 !== checked.patchEvidence.baselineBefore) {
    return abortTaskTransaction(checked, 'baseline-drift');
  }
  let plan;
  try {
    plan = createVerificationPlan({
      manifest: checked.manifest,
      task: checked.task,
      projectState: currentState
    });
  } catch (error) {
    return abortTaskTransaction(checked, 'verification-plan-invalid', { detail: String(error.message || error) });
  }
  let verification;
  try {
    const execution = runVerificationPlan({
      plan,
      manifest: checked.manifest,
      projectRoot: checked.staging,
      timeoutMs: options.verificationTimeoutMs
    });
    verification = evaluateVerificationExecution(plan, execution);
  } catch (error) {
    return abortTaskTransaction(checked, 'verification-execution-error', { detail: String(error.message || error) });
  }
  if (!verification.pass) return abortTaskTransaction(checked, 'verification-failed', { verification });
  let verifiedRecords;
  try {
    verifiedRecords = deriveVerifiedProjectRecords({ task: checked.task, plan, verification });
  } catch (error) {
    return abortTaskTransaction(checked, 'verified-records-invalid', { detail: String(error.message || error) });
  }

  const verifiedAt = options.verifiedAt || new Date().toISOString();
  let evidenceSha256;
  let nextState;
  try {
    const evidence = {
      schemaVersion: PROJECT_EVIDENCE_SCHEMA,
      projectId: checked.manifest.projectId,
      taskId: checked.task.taskId,
      taskContractSha256: checked.task.contractSha256,
      manifestSha256: checked.manifest.contractSha256,
      model: options.modelEvidence,
      operation: options.operationEvidence,
      context: options.operationEvidence.context,
      filesChanged: checked.patchEvidence.filesChanged,
      baselineBefore: checked.patchEvidence.baselineBefore,
      baselineAfter: checked.patchEvidence.candidateAfter,
      verification,
      result: 'PASS',
      verifiedAt
    };
    const evidenceText = `${JSON.stringify(evidence, null, 2)}\n`;
    evidenceSha256 = sha256(Buffer.from(evidenceText));
    const evidenceDir = path.join(checked.staging, '.factory', 'evidence', checked.task.taskId);
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, `${checked.id}.json`), evidenceText, { mode: 0o600 });
    nextState = nextVerifiedState(currentState, {
      task: checked.task,
      patchEvidence: checked.patchEvidence,
      evidenceSha256,
      verifiedAt,
      verifiedRecords,
      saveSchemaVersion: options.saveSchemaVersion,
      buildVersion: options.buildVersion
    });
    writeProjectStateAtomic(checked.staging, nextState);

    const finalCandidate = captureProjectTree(checked.staging, treeOptions(checked.manifest));
    if (finalCandidate.treeSha256 !== checked.patchEvidence.candidateAfter) {
      return abortTaskTransaction(checked, 'candidate-drift-before-swap');
    }
    writeJournal(checked, 'swapping');
  } catch (error) {
    return abortTaskTransaction(checked, 'candidate-finalization-error', { detail: String(error.message || error) });
  }

  try {
    fs.renameSync(checked.projectRoot, checked.backup);
    fs.renameSync(checked.staging, checked.projectRoot);
    writeJournal(checked, 'committed');
  } catch (error) {
    if (fs.existsSync(checked.backup)) {
      if (fs.existsSync(checked.projectRoot)) fs.rmSync(checked.projectRoot, { recursive: true, force: true });
      fs.renameSync(checked.backup, checked.projectRoot);
    }
    fs.rmSync(checked.staging, { recursive: true, force: true });
    fs.rmSync(checked.journalFile, { force: true });
    releaseProjectLock(checked.projectRoot, checked.lock);
    throw error;
  }
  fs.rmSync(checked.backup, { recursive: true, force: true });
  fs.rmSync(checked.journalFile, { force: true });
  releaseProjectLock(checked.projectRoot, checked.lock);
  return Object.freeze({
    status: 'committed',
    baselinePromoted: true,
    evidenceSha256,
    verification,
    state: nextState
  });
}
