import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../config.mjs';

const COMMIT_SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const ARTIFACT_SHA = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._-]+$/;

function fail(message) {
  throw new Error(`lesson promotion proof: ${message}`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function git(root, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: options.binary ? null : 'utf8',
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.status !== 0) {
    fail(`git ${args.join(' ')} failed`);
  }
  return result;
}

export function verifyLessonPromotionProvenance(lesson, { root = ROOT } = {}) {
  const id = String(lesson?.id || '').trim();
  if (!SAFE_ID.test(id)) fail('lesson id is unsafe');

  const promotionFile = path.join(root, 'learning', 'promotions', `${id}.json`);
  if (!fs.existsSync(promotionFile)) fail(`promotion record missing for ${id}`);

  let promotion;
  try {
    promotion = JSON.parse(fs.readFileSync(promotionFile, 'utf8'));
  } catch (error) {
    fail(`promotion record invalid JSON for ${id}: ${error.message}`);
  }

  if (promotion?.schemaVersion !== 'learning-promotion-v2') fail('promotion schema invalid');
  if (promotion?.candidateId !== id) fail('promotion candidate mismatch');
  if (promotion?.approvalKind !== 'human-merge') fail('promotion is not human-merge approved');
  if (String(promotion?.promotionRef || '') !== String(lesson?.promotionRef || '')) {
    fail('promotion reference mismatch');
  }

  const mergeCommitSha = String(promotion?.mergeCommitSha || '').trim().toLowerCase();
  if (!COMMIT_SHA.test(mergeCommitSha)) fail('promotion merge commit invalid');
  if (mergeCommitSha !== String(lesson?.mergeCommitSha || '').trim().toLowerCase()) {
    fail('lesson merge commit mismatch');
  }

  const artifact = promotion?.candidateArtifact;
  const expectedRef = `learning/candidates/${id}.json`;
  if (artifact?.ref !== expectedRef) fail('promotion candidate artifact ref mismatch');

  const artifactSha = String(artifact?.sha256 || '').trim().toLowerCase();
  if (!ARTIFACT_SHA.test(artifactSha)) fail('promotion candidate artifact sha invalid');
  if (artifactSha !== String(lesson?.candidateArtifactSha256 || '').trim().toLowerCase()) {
    fail('lesson candidate artifact sha mismatch');
  }

  git(root, ['cat-file', '-e', `${mergeCommitSha}^{commit}`]);
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', mergeCommitSha, 'HEAD'], {
    cwd: root,
    encoding: 'utf8'
  });
  if (ancestor.status !== 0) fail('promotion merge commit is not an ancestor of current HEAD');

  const blob = git(root, ['show', `${mergeCommitSha}:${expectedRef}`], { binary: true }).stdout;
  if (sha256(blob) !== artifactSha) fail('promotion merge commit contains different candidate artifact');

  return {
    pass: true,
    candidateId: id,
    promotionRef: promotion.promotionRef,
    mergeCommitSha,
    candidateArtifactSha256: artifactSha
  };
}
