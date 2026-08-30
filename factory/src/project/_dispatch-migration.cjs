const fs = require('node:fs');

function replaceOnce(file, oldText, newText) {
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(oldText).length - 1;
  if (count !== 1) throw new Error(`expected exactly one match in ${file}, found ${count}`);
  fs.writeFileSync(file, text.replace(oldText, newText));
}

const runner = 'factory/src/project/runner.mjs';
replaceOnce(
  runner,
  "} from './git-task-pr.mjs';\n",
  "} from './git-task-pr.mjs';\nimport { dispatchTrustedProjectPr } from './trusted-pr-dispatch.mjs';\n"
);
replaceOnce(
  runner,
  'async function publishVerifiedTask({ context, task, promotion, repository, token, fetchImpl, push }) {',
  'async function publishVerifiedTask({\n  context, task, promotion, repository, token, fetchImpl, dispatchFetchImpl, push\n}) {'
);
replaceOnce(
  runner,
  "  validateTaskPrAuthorityRecord(durableBinding, pull);\n  validateTaskPrBinding(durableBinding, { task, promotion, expectedHeadSha: pull.head.sha });\n  return Object.freeze({ binding: durableBinding, pullRequest: pull });",
  "  validateTaskPrAuthorityRecord(durableBinding, pull);\n  validateTaskPrBinding(durableBinding, { task, promotion, expectedHeadSha: pull.head.sha });\n  const provenanceDispatch = await dispatchTrustedProjectPr({\n    repository,\n    token,\n    pull,\n    task,\n    trustedRef: context.baseBranch,\n    fetchImpl: dispatchFetchImpl\n  });\n  return Object.freeze({ binding: durableBinding, pullRequest: pull, provenanceDispatch });"
);
replaceOnce(
  runner,
  '  fetchImpl = globalThis.fetch,\n  push = true,',
  '  fetchImpl = globalThis.fetch,\n  dispatchFetchImpl = fetchImpl,\n  push = true,'
);
replaceOnce(
  runner,
  '      token,\n      fetchImpl,\n      push',
  '      token,\n      fetchImpl,\n      dispatchFetchImpl,\n      push'
);
replaceOnce(
  runner,
  '      promotion,\n      binding: published.binding,\n      pullRequest: {',
  '      promotion,\n      binding: published.binding,\n      provenanceDispatch: published.provenanceDispatch,\n      pullRequest: {'
);

const neg = 'factory/src/project/test-pg-a0-negative.mjs';
replaceOnce(
  neg,
  'function runOptions(fixture, { requestEngineerPatch, fetchImpl, push = false } = {}) {\n  return {',
  'function runOptions(\n  fixture,\n  { requestEngineerPatch, fetchImpl, dispatchFetchImpl = async () => ({ ok: true, status: 204 }), push = false } = {}\n) {\n  return {'
);
replaceOnce(
  neg,
  '    fetchImpl,\n    push,',
  '    fetchImpl,\n    dispatchFetchImpl,\n    push,'
);
const marker = 'async function proveRemoteCleanupFailureIsVisible() {';
const insert = `async function proveTrustedDispatchFailureFailsClosed() {
  const fixture = initializeFixture({ withRemote: true });
  let closeRequested = false;
  try {
    await assert.rejects(runPgA0Task(runOptions(fixture, {
      requestEngineerPatch: async () => goodEngineerResult(),
      fetchImpl: successPullFetch(fixture),
      dispatchFetchImpl: async (url, options) => {
        if (url.includes('/actions/workflows/trusted-project-pr-provenance.yml/dispatches')) {
          return {
            ok: false,
            status: 403,
            json: async () => ({ message: 'Actions dispatch denied' })
          };
        }
        if (url.endsWith('/pulls/88') && options?.method === 'PATCH') {
          closeRequested = JSON.parse(options.body).state === 'closed';
          return { ok: true, status: 200 };
        }
        throw new Error('unexpected trusted dispatch cleanup request: ' + url);
      },
      push: true
    })), /trusted Project PR provenance dispatch failed: HTTP 403: Actions dispatch denied/);
    assert.equal(closeRequested, true);
    assertRolledBack(fixture);
    assert.equal(git(fixture.root, ['ls-remote', '--heads', 'origin', TASK_BRANCH]).stdout, '');
  } finally {
    cleanupFixture(fixture);
  }
}

`;
replaceOnce(neg, marker, insert + marker);
replaceOnce(
  neg,
  'await proveRemotePushIsRolledBackOnGithubFailure();\nawait proveRemoteCleanupFailureIsVisible();',
  'await proveRemotePushIsRolledBackOnGithubFailure();\nawait proveTrustedDispatchFailureFailsClosed();\nawait proveRemoteCleanupFailureIsVisible();'
);

const pos = 'factory/src/project/test-pg-a0.mjs';
replaceOnce(
  pos,
  '  let requestedContext = null;\n  let postedBody = null;',
  '  let requestedContext = null;\n  let postedBody = null;\n  let dispatchedBody = null;'
);
replaceOnce(
  pos,
  "      };\n    }\n  });\n\n  assert.equal(result.status, 'pr-open');",
  "      };\n    },\n    dispatchFetchImpl: async (url, options) => {\n      assert.match(url, /trusted-project-pr-provenance\\.yml\\/dispatches$/);\n      dispatchedBody = JSON.parse(options.body);\n      return { ok: true, status: 204 };\n    }\n  });\n\n  assert.equal(result.status, 'pr-open');"
);
replaceOnce(
  pos,
  '  assert.equal(result.binding.projectId, task.projectId);\n  assert.equal(result.binding.headRef, result.pullRequest.headRef);',
  "  assert.equal(result.binding.projectId, task.projectId);\n  assert.equal(result.provenanceDispatch.prNumber, result.pullRequest.number);\n  assert.equal(result.provenanceDispatch.headSha, result.pullRequest.headSha);\n  assert.equal(dispatchedBody.ref, 'main');\n  assert.equal(dispatchedBody.inputs.pr_number, String(result.pullRequest.number));\n  assert.equal(dispatchedBody.inputs.expected_head_sha, result.pullRequest.headSha);\n  assert.equal(dispatchedBody.inputs.expected_base_sha, result.pullRequest.baseSha);\n  assert.equal(result.binding.headRef, result.pullRequest.headRef);"
);
