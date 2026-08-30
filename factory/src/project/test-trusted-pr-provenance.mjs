import assert from 'node:assert/strict';
import { taskPrBindingBody } from './git-task-pr.mjs';
import { validateTrustedProjectPrProvenance } from './trusted-pr-provenance.mjs';

const REPOSITORY = 'Bartekkk87/game-factory';
const HEAD_SHA = '1'.repeat(40);
const BASE_SHA = '2'.repeat(40);
const HEAD_REF = 'project-task/fixture/TASK-F3';

function binding(overrides = {}) {
  return {
    schemaVersion: 'project-game.task-pr-binding/v1',
    projectId: 'fixture',
    taskId: 'TASK-F3',
    taskContractSha256: 'a'.repeat(64),
    baselineTreeSha256: 'b'.repeat(64),
    evidenceSha256: 'c'.repeat(64),
    headRef: HEAD_REF,
    headSha: HEAD_SHA,
    baseRef: 'main',
    baseHeadSha: BASE_SHA,
    ...overrides
  };
}

function pull(overrides = {}) {
  const record = binding();
  return {
    number: 72,
    body: taskPrBindingBody(record),
    head: {
      sha: HEAD_SHA,
      ref: HEAD_REF,
      repo: { full_name: REPOSITORY }
    },
    base: {
      sha: BASE_SHA,
      ref: 'main',
      repo: { full_name: REPOSITORY }
    },
    ...overrides
  };
}

const changedFiles = ['projects/fixture/src/value.mjs'];
const eventPull = pull();
const livePull = pull();
const positive = validateTrustedProjectPrProvenance({
  repository: REPOSITORY,
  eventPull,
  livePull,
  changedFiles
});
assert.equal(positive.required, true);
assert.equal(positive.prNumber, 72);
assert.equal(positive.headSha, HEAD_SHA);
assert.equal(positive.baseSha, BASE_SHA);

// AC-F3-03: same commit SHA on another PR is not valid evidence.
assert.throws(() => validateTrustedProjectPrProvenance({
  repository: REPOSITORY,
  eventPull,
  livePull: pull({ number: 73 }),
  changedFiles
}), /number changed/);

// AC-F3-04: a new PR head invalidates old evidence.
assert.throws(() => validateTrustedProjectPrProvenance({
  repository: REPOSITORY,
  eventPull,
  livePull: pull({
    head: { sha: '3'.repeat(40), ref: HEAD_REF, repo: { full_name: REPOSITORY } }
  }),
  changedFiles
}), /headSha changed/);

// AC-F3-05: base movement invalidates old evidence.
assert.throws(() => validateTrustedProjectPrProvenance({
  repository: REPOSITORY,
  eventPull,
  livePull: pull({
    base: { sha: '4'.repeat(40), ref: 'main', repo: { full_name: REPOSITORY } }
  }),
  changedFiles
}), /baseSha changed/);

// AC-F3-06: even a self-consistent forged binding on a helper branch with the same SHA is rejected.
const helperBinding = binding({ headRef: 'helper/fixture' });
const helper = pull({
  body: taskPrBindingBody(helperBinding),
  head: { sha: HEAD_SHA, ref: 'helper/fixture', repo: { full_name: REPOSITORY } }
});
assert.throws(() => validateTrustedProjectPrProvenance({
  repository: REPOSITORY,
  eventPull: helper,
  livePull: helper,
  changedFiles
}), /task branch identity mismatch/);

// Candidate workflow/control-plane changes cannot hide inside a Project Task PR.
const projectPlusWorkflow = [...changedFiles, '.github/workflows/verify.yml'];
assert.throws(() => validateTrustedProjectPrProvenance({
  repository: REPOSITORY,
  eventPull,
  livePull,
  changedFiles: projectPlusWorkflow
}), /changes outside bound project/);

// Existing non-Project PRs remain compatible and do not need a Project Task binding.
const ordinaryPull = {
  number: 74,
  body: 'ordinary Micro-Game/control PR',
  head: { sha: '5'.repeat(40), ref: 'feature/ordinary', repo: { full_name: REPOSITORY } },
  base: { sha: BASE_SHA, ref: 'main', repo: { full_name: REPOSITORY } }
};
const ordinary = validateTrustedProjectPrProvenance({
  repository: REPOSITORY,
  eventPull: ordinaryPull,
  livePull: structuredClone(ordinaryPull),
  changedFiles: ['factory/src/verify/example.mjs']
});
assert.equal(ordinary.required, false);

await import('./test-trusted-bot-selftest.mjs');

console.log('trusted Project PR provenance adversarial selftest: PASS');
