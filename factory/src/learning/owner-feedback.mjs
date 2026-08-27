import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PATHS } from '../config.mjs';
import { readJson, writeJson } from '../util/fsx.mjs';

export const OWNER_FEEDBACK_SCHEMA = 'owner-feedback-v1';
export const OWNER_FEEDBACK_DIR = path.join(ROOT, 'learning', 'evidence', 'owner-feedback');

function nonEmpty(value, name) { const text = String(value ?? '').trim(); if (!text) throw new Error(`${name} is required`); return text; }

export function parseOwnerCommand(rawText) {
  const raw = String(rawText ?? '');
  const firstLine = raw.split(/\r?\n/, 1)[0] ?? '';
  const match = firstLine.match(/^\/(approve|reject|feedback)(?:\s+(.*))?$/i);
  const command = match ? match[1].toLowerCase() : null;
  let parsedReason = null;
  if (command === 'reject' || command === 'feedback') parsedReason = raw.replace(new RegExp(`^/${command}(?:[ \\t]+)?`, 'i'), '');
  return { parsedCommand: command, parsedReason };
}

function resolveCandidate(slug, sourceRunIds = [], candidateSha = null) {
  if (!slug) return { slug: null, candidateSha: candidateSha || null, sourceRunIds: [...sourceRunIds] };
  const draftMeta = readJson(path.join(PATHS.drafts, slug, 'meta.json'), null);
  const runIds = new Set(sourceRunIds.map(String));
  for (const value of [draftMeta?.runId, draftMeta?.productionRunId, ...(Array.isArray(draftMeta?.runIds) ? draftMeta.runIds : [])]) if (value !== undefined && value !== null && String(value).trim()) runIds.add(String(value));
  return { slug, candidateSha: candidateSha || draftMeta?.candidateSha || null, sourceRunIds: [...runIds].sort() };
}

export function ownerFeedbackId({ issueNumber, commentId }) { return `gh-issue-${nonEmpty(issueNumber, 'issueNumber')}-comment-${nonEmpty(commentId, 'commentId')}`; }

export function captureOwnerFeedback({ issueNumber, commentId, issueUrl = null, commentUrl = null, author = null, rawText, slug = null, sourceRunIds = [], candidateSha = null, createdAt = null }) {
  const id = ownerFeedbackId({ issueNumber, commentId });
  const exactRawText = String(rawText ?? '');
  const parsed = parseOwnerCommand(exactRawText);
  if (!parsed.parsedCommand) throw new Error('owner feedback must start with /approve, /reject, or /feedback');
  const candidate = resolveCandidate(slug, sourceRunIds, candidateSha);
  const record = {
    schemaVersion: OWNER_FEEDBACK_SCHEMA, id, sourceKind: 'owner-feedback',
    issue: { number: Number(issueNumber), commentId: Number(commentId), issueUrl: issueUrl || null, commentUrl: commentUrl || null, author: author || null },
    rawText: exactRawText, parsedCommand: parsed.parsedCommand, parsedReason: parsed.parsedReason,
    candidate: { slug: candidate.slug }, sourceRunIds: candidate.sourceRunIds, candidateSha: candidate.candidateSha,
    createdAt: createdAt || new Date().toISOString(),
    provenance: { system: 'github-issue-comment', immutableIdentity: `${issueNumber}:${commentId}`, captureVersion: OWNER_FEEDBACK_SCHEMA }
  };
  const file = path.join(OWNER_FEEDBACK_DIR, `${id}.json`);
  const existing = readJson(file, null);
  if (existing) {
    if (existing.id !== record.id || existing.rawText !== record.rawText || existing.issue?.commentId !== record.issue.commentId || existing.issue?.number !== record.issue.number) throw new Error(`owner feedback identity collision for ${id}`);
    return { record: existing, file, created: false };
  }
  fs.mkdirSync(OWNER_FEEDBACK_DIR, { recursive: true }); writeJson(file, record); return { record, file, created: true };
}

const fromEnv = (name, fallback = null) => process.env[name] === undefined ? fallback : process.env[name];
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const result = captureOwnerFeedback({ issueNumber: fromEnv('GF_OWNER_ISSUE_NUMBER'), commentId: fromEnv('GF_OWNER_COMMENT_ID'), issueUrl: fromEnv('GF_OWNER_ISSUE_URL'), commentUrl: fromEnv('GF_OWNER_COMMENT_URL'), author: fromEnv('GF_OWNER_AUTHOR'), rawText: fromEnv('GF_OWNER_COMMENT', ''), slug: fromEnv('GF_OWNER_SLUG'), createdAt: fromEnv('GF_OWNER_CREATED_AT') });
  console.log(`${result.created ? 'CAPTURED' : 'ALREADY_CAPTURED'}: ${path.relative(ROOT, result.file)}`);
}
