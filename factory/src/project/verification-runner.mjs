import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertSha256,
  normalizeProjectPath,
  pathMatchesPrefix,
  sha256,
  validateProjectManifest
} from './contracts.mjs';

const EXECUTION_SCHEMA = 'project-game.verification-execution/v1';
const CHECK_EVIDENCE_SCHEMA = 'project-game.check-evidence/v1';
const MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30000;

function parseNodeCommand(command, manifest) {
  const match = /^node ([A-Za-z0-9._/-]+\.(?:mjs|js))$/.exec(String(command || ''));
  if (!match) throw new Error('verification command is not an approved direct Node script');
  const script = normalizeProjectPath(match[1], 'verification command script');
  if (!pathMatchesPrefix(script, manifest.layout.testsDir)) {
    throw new Error(`verification command must target manifest testsDir: ${script}`);
  }
  return script;
}

function evidenceFile(projectRoot, taskId, checkId) {
  return path.join(projectRoot, '.factory', 'verification', taskId, `${checkId}.json`);
}

function executeCheck({ projectRoot, manifest, plan, check, timeoutMs }) {
  const startedAt = new Date().toISOString();
  const startedNs = process.hrtime.bigint();
  let script = null;
  let status = null;
  let signal = null;
  let stdout = '';
  let stderr = '';
  let error = null;
  let runner = 'unsupported/v1';

  try {
    if (check.kind !== 'command') throw new Error(`unsupported deterministic check kind: ${check.kind}`);
    script = parseNodeCommand(check.command, manifest);
    const absoluteScript = path.join(projectRoot, script);
    if (!fs.existsSync(absoluteScript) || !fs.statSync(absoluteScript).isFile()) {
      throw new Error(`verification script missing: ${script}`);
    }
    if (fs.lstatSync(absoluteScript).isSymbolicLink()) throw new Error(`verification script is a symlink: ${script}`);
    runner = 'node-direct/v1';
    const result = spawnSync(process.execPath, [absoluteScript], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: MAX_OUTPUT_BYTES,
      shell: false,
      env: {
        PATH: process.env.PATH || '',
        NODE_ENV: 'test',
        TZ: 'UTC',
        LANG: 'C'
      }
    });
    status = result.status;
    signal = result.signal || null;
    stdout = String(result.stdout || '');
    stderr = String(result.stderr || '');
    error = result.error ? String(result.error.message || result.error) : null;
  } catch (caught) {
    error = String(caught?.message || caught);
  }

  const durationMs = Number((process.hrtime.bigint() - startedNs) / 1000000n);
  const pass = status === 0 && signal === null && error === null;
  const artifact = {
    schemaVersion: CHECK_EVIDENCE_SCHEMA,
    planSha256: plan.planSha256,
    taskId: plan.taskId,
    checkId: check.id,
    checkDefinitionSha256: check.definitionSha256,
    runner,
    producer: 'verification-script-process/v1',
    verifier: 'project-control-runner/v1',
    command: script ? { executable: 'node', args: [script] } : null,
    startedAt,
    durationMs,
    exitStatus: status,
    signal,
    stdout,
    stderr,
    error,
    pass
  };
  const file = evidenceFile(projectRoot, plan.taskId, check.id);
  const content = `${JSON.stringify(artifact, null, 2)}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { mode: 0o600 });
  return Object.freeze({
    checkId: check.id,
    artifactPath: path.relative(projectRoot, file).split(path.sep).join('/'),
    evidenceSha256: sha256(Buffer.from(content))
  });
}

export function runVerificationPlan({ plan, manifest, projectRoot, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (plan?.schemaVersion !== 'project-game.verification-plan/v1') throw new Error('verification plan schema invalid');
  const checkedManifest = validateProjectManifest(manifest);
  const root = path.resolve(projectRoot);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) {
    throw new Error('verification timeoutMs is invalid');
  }
  const checks = plan.checks.map((check) => executeCheck({
    projectRoot: root,
    manifest: checkedManifest,
    plan,
    check,
    timeoutMs
  }));
  return Object.freeze({
    schemaVersion: EXECUTION_SCHEMA,
    planSha256: plan.planSha256,
    taskId: plan.taskId,
    projectRoot: root,
    checks
  });
}

export function evaluateVerificationExecution(plan, execution) {
  if (plan?.schemaVersion !== 'project-game.verification-plan/v1') throw new Error('verification plan schema invalid');
  if (execution?.schemaVersion !== EXECUTION_SCHEMA) throw new Error('verification execution schema invalid');
  if (execution.planSha256 !== plan.planSha256 || execution.taskId !== plan.taskId) {
    throw new Error('verification execution does not match plan');
  }
  const byId = new Map(execution.checks.map((item) => [item.checkId, item]));
  if (byId.size !== execution.checks.length) throw new Error('verification execution contains duplicate checks');
  if (execution.checks.length !== plan.checks.length) throw new Error('verification execution check count mismatch');
  const checks = plan.checks.map((check) => {
    const result = byId.get(check.id);
    let artifact = null;
    let evidenceSha256 = null;
    let artifactError = null;
    try {
      if (!result) throw new Error('missing execution result');
      const relative = normalizeProjectPath(result.artifactPath, 'verification artifact path');
      if (!pathMatchesPrefix(relative, `.factory/verification/${plan.taskId}`)) {
        throw new Error('verification artifact is outside the task evidence directory');
      }
      const file = path.join(execution.projectRoot, relative);
      const content = fs.readFileSync(file);
      evidenceSha256 = sha256(content);
      if (evidenceSha256 !== assertSha256(result.evidenceSha256, 'verification evidence SHA')) {
        throw new Error('verification evidence SHA mismatch');
      }
      artifact = JSON.parse(content.toString('utf8'));
      if (artifact.schemaVersion !== CHECK_EVIDENCE_SCHEMA
        || artifact.planSha256 !== plan.planSha256
        || artifact.taskId !== plan.taskId
        || artifact.checkId !== check.id
        || artifact.checkDefinitionSha256 !== check.definitionSha256) {
        throw new Error('verification evidence identity mismatch');
      }
    } catch (caught) {
      artifactError = String(caught?.message || caught);
    }
    const independent = artifact?.producer === 'verification-script-process/v1'
      && artifact?.verifier === 'project-control-runner/v1';
    const pass = artifactError === null && artifact?.pass === true && independent;
    return {
      id: check.id,
      level: check.level,
      pass,
      independent,
      evidenceSha256,
      artifactPath: result?.artifactPath || null,
      detail: artifactError || artifact?.error || artifact?.stderr || artifact?.stdout || '',
      runner: artifact?.runner || null,
      producer: artifact?.producer || null,
      verifier: artifact?.verifier || null
    };
  });
  const failures = checks.filter((check) => !check.pass);
  return Object.freeze({
    schemaVersion: 'project-game.verification-result/v1',
    planSha256: plan.planSha256,
    taskId: plan.taskId,
    pass: checks.length > 0 && failures.length === 0,
    checks,
    failures
  });
}
