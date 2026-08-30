import fs from 'node:fs';
import { parseTaskPrBindingBody, validateTaskPrAuthorityRecord } from './git-task-pr.mjs';

const EVIDENCE_SCHEMA = 'project-game.trusted-pr-provenance/v1';
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function requireRepository(value) {
  const text = String(value || '').trim();
  if (!REPOSITORY.test(text)) throw new Error('trusted PR provenance repository invalid');
  return text;
}

function requirePullNumber(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${field} invalid`);
  return number;
}

function normalizeFiles(values) {
  if (!Array.isArray(values)) throw new Error('trusted PR provenance changed files invalid');
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

function pullIdentity(pull, field) {
  if (!pull || typeof pull !== 'object' || Array.isArray(pull)) throw new Error(`${field} invalid`);
  return Object.freeze({
    number: requirePullNumber(pull.number, `${field} number`),
    headSha: String(pull.head?.sha || '').trim().toLowerCase(),
    headRef: String(pull.head?.ref || '').trim(),
    headRepository: String(pull.head?.repo?.full_name || '').trim(),
    baseSha: String(pull.base?.sha || '').trim().toLowerCase(),
    baseRef: String(pull.base?.ref || '').trim(),
    baseRepository: String(pull.base?.repo?.full_name || '').trim()
  });
}

function assertSameIdentity(expected, actual) {
  for (const field of ['number', 'headSha', 'headRef', 'headRepository', 'baseSha', 'baseRef', 'baseRepository']) {
    if (actual[field] !== expected[field]) throw new Error(`trusted PR provenance ${field} changed`);
  }
}

export function projectPrRequiresProvenance(changedFiles = []) {
  return normalizeFiles(changedFiles).some((file) => file === 'projects' || file.startsWith('projects/'));
}

export function validateTrustedProjectPrProvenance({ repository, eventPull, livePull, changedFiles } = {}) {
  const repo = requireRepository(repository);
  const files = normalizeFiles(changedFiles);
  const required = projectPrRequiresProvenance(files);
  const eventIdentity = pullIdentity(eventPull, 'event pull');
  const liveIdentity = pullIdentity(livePull, 'live pull');
  assertSameIdentity(eventIdentity, liveIdentity);

  if (liveIdentity.headRepository !== repo || liveIdentity.baseRepository !== repo) {
    throw new Error('trusted PR provenance requires a same-repository candidate');
  }

  if (!required) {
    return Object.freeze({
      schemaVersion: EVIDENCE_SCHEMA,
      required: false,
      repository: repo,
      prNumber: liveIdentity.number,
      headRef: liveIdentity.headRef,
      headSha: liveIdentity.headSha,
      baseRef: liveIdentity.baseRef,
      baseSha: liveIdentity.baseSha
    });
  }

  const binding = parseTaskPrBindingBody(livePull.body);
  validateTaskPrAuthorityRecord(binding, livePull);
  const expectedHeadRef = `project-task/${binding.projectId}/${binding.taskId}`;
  if (liveIdentity.headRef !== expectedHeadRef) {
    throw new Error('trusted PR provenance task branch identity mismatch');
  }
  const projectPrefix = `projects/${binding.projectId}/`;
  if (files.some((file) => !file.startsWith(projectPrefix))) {
    throw new Error('trusted PR provenance Project Task PR changes outside bound project');
  }

  return Object.freeze({
    schemaVersion: EVIDENCE_SCHEMA,
    required: true,
    repository: repo,
    prNumber: liveIdentity.number,
    projectId: binding.projectId,
    taskId: binding.taskId,
    taskContractSha256: binding.taskContractSha256,
    headRef: liveIdentity.headRef,
    headSha: liveIdentity.headSha,
    baseRef: liveIdentity.baseRef,
    baseSha: liveIdentity.baseSha
  });
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing ${name}`);
  return process.argv[index + 1];
}

function readJson(file, field) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${field} unreadable: ${error.message}`);
  }
}

function runCli() {
  const event = readJson(argument('--event'), 'GitHub event');
  const livePull = readJson(argument('--pull'), 'live pull');
  const changedFiles = fs.readFileSync(argument('--files'), 'utf8').split('\n').filter(Boolean);
  const evidence = validateTrustedProjectPrProvenance({
    repository: process.env.GITHUB_REPOSITORY,
    eventPull: event.pull_request,
    livePull,
    changedFiles
  });
  fs.writeFileSync(argument('--out'), `${JSON.stringify(evidence, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export const TRUSTED_PR_PROVENANCE_SCHEMA = EVIDENCE_SCHEMA;
