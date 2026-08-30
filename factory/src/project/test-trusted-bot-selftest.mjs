import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../config.mjs';
import { dispatchTrustedProjectPr } from './trusted-pr-dispatch.mjs';

const repository = 'Bartekkk87/game-factory';
const projectId = 'fixture';
const taskId = 'TASK-BOT-SELFTEST';
const headSha = '1'.repeat(40);
const baseSha = '2'.repeat(40);
const headRef = `project-task/${projectId}/${taskId}`;
const pull = {
  number: 84,
  head: { sha: headSha, ref: headRef },
  base: { sha: baseSha, ref: 'main' }
};
const task = { projectId, taskId };

function response({ ok = true, status = 204, message = '' } = {}) {
  return {
    ok,
    status,
    async json() { return { message }; }
  };
}

const calls = [];
const result = await dispatchTrustedProjectPr({
  repository,
  token: 'token',
  pull,
  task,
  trustedRef: 'main',
  fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return response();
  }
});

assert.deepEqual(result.workflows, [
  'trusted-project-pr-provenance.yml',
  'trusted-bot-selftest.yml'
]);
assert.equal(calls.length, 2);
assert.match(calls[0].url, /trusted-project-pr-provenance\.yml\/dispatches$/);
assert.match(calls[1].url, /trusted-bot-selftest\.yml\/dispatches$/);
for (const call of calls) {
  assert.equal(call.options.method, 'POST');
  const body = JSON.parse(call.options.body);
  assert.deepEqual(body, {
    ref: 'main',
    inputs: {
      repository,
      pr_number: '84',
      project_id: projectId,
      task_id: taskId,
      expected_head_sha: headSha,
      expected_base_ref: 'main',
      expected_base_sha: baseSha
    }
  });
}
assert.equal(calls[0].options.body, calls[1].options.body, 'both trusted gates must receive identical binding');

// Failure of the second required gate must fail closed and close the just-created PR.
const failedCalls = [];
await assert.rejects(
  dispatchTrustedProjectPr({
    repository,
    token: 'token',
    pull,
    task,
    trustedRef: 'main',
    fetchImpl: async (url, options) => {
      failedCalls.push({ url, options });
      if (url.includes('trusted-project-pr-provenance.yml')) return response();
      if (url.includes('trusted-bot-selftest.yml')) return response({ ok: false, status: 403, message: 'denied' });
      if (url.endsWith('/pulls/84') && options.method === 'PATCH') return response();
      throw new Error(`unexpected fetch: ${url}`);
    }
  }),
  /bot selftest dispatch failed: HTTP 403: denied/
);
assert.equal(failedCalls.some((call) => call.url.endsWith('/pulls/84') && call.options.method === 'PATCH'), true);

const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/trusted-bot-selftest.yml'), 'utf8');
assert.match(workflow, /^\s*workflow_dispatch:/m);
assert.doesNotMatch(workflow, /^\s{2}selftest:\s*$/m, 'bot workflow must not create a competing selftest job');
assert.match(workflow, /^\s{2}trusted-bot-selftest:\s*$/m);
assert.match(workflow, /-f name='selftest'/);
assert.match(workflow, /trusted-selftest\.yml/);
assert.match(workflow, /trusted-bot-selftest\.yml/);
assert.match(workflow, /\.github\/workflows\/verify\.yml/);
assert.match(workflow, /competing selftest check authority/);
assert.match(workflow, /event=workflow_dispatch/);
assert.match(workflow, /\.head_sha == \$sha and \.head_branch == \$ref and \.event == "workflow_dispatch"/);
assert.match(workflow, /live-pr-final\.json/);
assert.match(workflow, /cmp -s initial-provenance\.json final-provenance\.json/);
assert.match(workflow, /Complete candidate-head required selftest check/);
assert.match(workflow, /CONCLUSION="failure"/);

console.log('trusted bot Project selftest gate: PASS');
