import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../config.mjs';
import {
  loadProjectBootstrapAuthority,
  runProjectBootstrap,
  validateMaterializedProjectBootstrap
} from './bootstrap-runner.mjs';
import { sha256 } from './contracts.mjs';
import { parseTaskPrBindingBody } from './git-task-pr.mjs';
import { validateTrustedProjectPrProvenance } from './trusted-pr-provenance.mjs';

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return String(result.stdout || '').trim();
}

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-project-bootstrap-'));
  const target = path.join(root, 'factory', 'project-bootstrap');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(path.join(ROOT, 'factory', 'project-bootstrap'), target, { recursive: true });
  git(root, ['init']);
  git(root, ['branch', '-M', 'main']);
  git(root, ['config', 'user.name', 'Project Bootstrap Fixture']);
  git(root, ['config', 'user.email', 'project-bootstrap@example.invalid']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'factory bootstrap authority']);
  return root;
}

const authority = loadProjectBootstrapAuthority({ repoRoot: ROOT, projectId: 'kepler-outpost' });
assert.equal(authority.spec.bootstrapTaskId, 'PROJECT-BOOTSTRAP');
assert.equal(authority.spec.files.length, 16);
assert.deepEqual(authority.spec.sourceSlots, [
  'src/play.html',
  'src/play.mjs',
  'src/simulation.mjs',
  'src/state.mjs'
]);
assert.equal(authority.state.baseline, null);
assert.equal(authority.task.scope.add.length, 0);
assert.equal(authority.task.scope.delete.length, 0);

const bootstrapWorkflow = fs.readFileSync(path.join(ROOT, '.github/workflows/project-bootstrap.yml'), 'utf8');
assert.match(bootstrapWorkflow, /run-project-bootstrap\.mjs/);
assert.equal(bootstrapWorkflow.includes('OPENROUTER'), false, 'bootstrap workflow must not expose a model lane');

const root = fixtureRoot();
try {
  const baseHeadSha = git(root, ['rev-parse', 'HEAD']);
  let postedBody = null;
  const dispatches = [];
  const result = await runProjectBootstrap({
    repoRoot: root,
    projectId: 'kepler-outpost',
    repository: 'example/game-factory',
    token: 'fixture-token',
    push: false,
    fetchImpl: async (_url, options) => {
      postedBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          number: 88,
          html_url: 'https://github.example/pr/88',
          body: postedBody.body,
          draft: false,
          head: { sha: git(root, ['rev-parse', 'HEAD']), ref: postedBody.head },
          base: { sha: baseHeadSha, ref: postedBody.base },
          headRepository: 'example/game-factory'
        })
      };
    },
    dispatchFetchImpl: async (url, options) => {
      dispatches.push({ url, body: JSON.parse(options.body) });
      return { ok: true, status: 204 };
    }
  });

  assert.equal(result.status, 'pr-open');
  assert.equal(result.projectId, 'kepler-outpost');
  assert.equal(result.taskId, 'PROJECT-BOOTSTRAP');
  assert.equal(result.pullRequest.draft, false);
  assert.equal(result.binding.taskContractSha256, authority.spec.contractSha256);
  assert.equal(result.binding.evidenceSha256, result.evidenceSha256);
  assert.equal(result.binding.baselineTreeSha256, result.baselineTreeSha256);
  assert.equal(dispatches.length, 2);
  assert.deepEqual(dispatches[0].body, dispatches[1].body);
  assert.equal(dispatches[0].body.inputs.project_id, 'kepler-outpost');
  assert.equal(dispatches[0].body.inputs.task_id, 'PROJECT-BOOTSTRAP');

  const projectRoot = path.join(root, 'projects', 'kepler-outpost');
  const materialized = validateMaterializedProjectBootstrap({
    projectRoot,
    authority: loadProjectBootstrapAuthority({ repoRoot: root, projectId: 'kepler-outpost' })
  });
  assert.equal(materialized.evidence.engineerCallExecuted, false);
  assert.equal(materialized.evidence.operation, 'project-bootstrap');
  assert.equal(materialized.evidence.sourceSlots.length, 4);
  assert.equal(materialized.evidenceSha256, result.evidenceSha256);

  const committedFiles = git(root, ['show', '--format=', '--name-only', 'HEAD']).split('\n').filter(Boolean);
  assert.equal(committedFiles.length, 19);
  assert.equal(committedFiles.every((file) => file.startsWith('projects/kepler-outpost/')), true);
  assert.equal(committedFiles.some((file) => file.includes('milestones/M2')), false);

  const binding = parseTaskPrBindingBody(postedBody.body);
  const pull = {
    number: 88,
    body: postedBody.body,
    head: {
      sha: result.pullRequest.headSha,
      ref: result.pullRequest.headRef,
      repo: { full_name: 'example/game-factory' }
    },
    base: {
      sha: result.pullRequest.baseSha,
      ref: result.pullRequest.baseRef,
      repo: { full_name: 'example/game-factory' }
    }
  };
  assert.equal(binding.headRef, 'project-task/kepler-outpost/PROJECT-BOOTSTRAP');
  const provenance = validateTrustedProjectPrProvenance({
    repository: 'example/game-factory',
    eventPull: pull,
    livePull: pull,
    changedFiles: committedFiles
  });
  assert.equal(provenance.required, true);
  assert.equal(provenance.projectId, 'kepler-outpost');
  assert.equal(provenance.taskId, 'PROJECT-BOOTSTRAP');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

const tampered = fixtureRoot();
try {
  fs.appendFileSync(
    path.join(tampered, 'factory/project-bootstrap/templates/kepler-outpost/src/state.mjs'),
    '// unauthorized template mutation\n'
  );
  assert.throws(() => loadProjectBootstrapAuthority({
    repoRoot: tampered,
    projectId: 'kepler-outpost'
  }), /file hash mismatch/);
} finally {
  fs.rmSync(tampered, { recursive: true, force: true });
}

const forged = fixtureRoot();
try {
  const approvalFile = path.join(forged, 'factory/project-bootstrap/approvals/kepler-outpost.json');
  const approval = JSON.parse(fs.readFileSync(approvalFile, 'utf8'));
  approval.bootstrapSpecSha256 = 'f'.repeat(64);
  fs.writeFileSync(approvalFile, `${JSON.stringify(approval, null, 2)}\n`);
  assert.throws(() => loadProjectBootstrapAuthority({
    repoRoot: forged,
    projectId: 'kepler-outpost'
  }), /approval binding mismatch/);
} finally {
  fs.rmSync(forged, { recursive: true, force: true });
}

const installedRoot = path.join(ROOT, 'projects', 'kepler-outpost');
if (fs.existsSync(installedRoot)) {
  const installedSpec = fs.readFileSync(path.join(installedRoot, '.factory/bootstrap/spec.json'));
  const installedApproval = fs.readFileSync(path.join(installedRoot, '.factory/bootstrap/owner-approval.json'));
  assert.equal(sha256(installedSpec), sha256(Buffer.from(authority.specText)));
  assert.equal(sha256(installedApproval), sha256(Buffer.from(authority.approvalText)));
  const state = JSON.parse(fs.readFileSync(path.join(installedRoot, '.factory/project-state.json'), 'utf8'));
  if (state.baseline === null) {
    validateMaterializedProjectBootstrap({ projectRoot: installedRoot, authority });
  } else {
    for (const file of authority.spec.files.filter((item) => (
      item.role !== 'source-slot' && item.role !== 'project-state'
    ))) {
      assert.equal(sha256(fs.readFileSync(path.join(installedRoot, file.path))), file.sha256);
    }
    const bootstrapEvidence = JSON.parse(fs.readFileSync(
      path.join(installedRoot, '.factory/evidence/PROJECT-BOOTSTRAP/bootstrap.json'),
      'utf8'
    ));
    assert.equal(bootstrapEvidence.bootstrapSpecSha256, authority.spec.contractSha256);
    assert.equal(bootstrapEvidence.engineerCallExecuted, false);
  }
}

console.log('Owner Project Bootstrap lifecycle selftest: PASS');
