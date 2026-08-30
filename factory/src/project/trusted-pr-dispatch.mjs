const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GIT_SHA = /^[0-9a-f]{40}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function requiredText(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${field} missing`);
  return text;
}

function commitSha(value, field) {
  const text = requiredText(value, field).toLowerCase();
  if (!GIT_SHA.test(text)) throw new Error(`${field} invalid`);
  return text;
}

function safeId(value, field) {
  const text = requiredText(value, field);
  if (!SAFE_ID.test(text)) throw new Error(`${field} invalid`);
  return text;
}

async function githubFailureDetail(response) {
  if (typeof response?.json !== 'function') return '';
  try {
    const payload = await response.json();
    if (typeof payload?.message !== 'string') return '';
    return payload.message.replace(/\s+/g, ' ').trim().slice(0, 300);
  } catch {
    return '';
  }
}

async function closePullRequestBestEffort({ repository, token, pullNumber, fetchImpl }) {
  try {
    await fetchImpl(`https://api.github.com/repos/${repository}/pulls/${pullNumber}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({ state: 'closed' })
    });
  } catch {
    // Branch rollback remains the hard fail-closed boundary; PR close is cleanup only.
  }
}

export async function dispatchTrustedProjectPr({
  repository,
  token,
  pull,
  task,
  trustedRef,
  fetchImpl = globalThis.fetch
} = {}) {
  const repo = requiredText(repository, 'trusted Project PR repository');
  if (!REPOSITORY.test(repo)) throw new Error('trusted Project PR repository invalid');
  const auth = requiredText(token, 'trusted Project PR token');
  if (typeof fetchImpl !== 'function') throw new Error('trusted Project PR fetch implementation missing');

  const projectId = safeId(task?.projectId, 'trusted Project PR projectId');
  const taskId = safeId(task?.taskId, 'trusted Project PR taskId');
  const prNumber = Number(pull?.number);
  if (!Number.isInteger(prNumber) || prNumber < 1) throw new Error('trusted Project PR number invalid');
  const headSha = commitSha(pull?.head?.sha, 'trusted Project PR head SHA');
  const baseSha = commitSha(pull?.base?.sha, 'trusted Project PR base SHA');
  const headRef = requiredText(pull?.head?.ref, 'trusted Project PR head ref');
  const baseRef = requiredText(pull?.base?.ref, 'trusted Project PR base ref');
  const dispatchRef = requiredText(trustedRef, 'trusted Project PR dispatch ref');
  const expectedHeadRef = `project-task/${projectId}/${taskId}`;
  if (headRef !== expectedHeadRef) throw new Error('trusted Project PR task branch mismatch');
  if (baseRef !== dispatchRef) throw new Error('trusted Project PR base ref mismatch');

  const response = await fetchImpl(
    `https://api.github.com/repos/${repo}/actions/workflows/trusted-project-pr-provenance.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${auth}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        ref: dispatchRef,
        inputs: {
          repository: repo,
          pr_number: String(prNumber),
          project_id: projectId,
          task_id: taskId,
          expected_head_sha: headSha,
          expected_base_ref: baseRef,
          expected_base_sha: baseSha
        }
      })
    }
  );
  if (!response?.ok) {
    const detail = await githubFailureDetail(response);
    await closePullRequestBestEffort({ repository: repo, token: auth, pullNumber: prNumber, fetchImpl });
    throw new Error(
      `trusted Project PR provenance dispatch failed: HTTP ${response?.status || 'unknown'}`
      + `${detail ? `: ${detail}` : ''}`
    );
  }

  return Object.freeze({
    workflow: 'trusted-project-pr-provenance.yml',
    trustedRef: dispatchRef,
    prNumber,
    projectId,
    taskId,
    headSha,
    baseRef,
    baseSha
  });
}
