import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PATHS } from '../config.mjs';
import { readJson, writeJson } from '../util/fsx.mjs';
import { aggregateEvidence } from './aggregate.mjs';
import { evaluateImprovementTrigger } from './trigger.mjs';
import { IMPROVEMENT_AUTHORITY, persistImprovementClaim } from './analysis.mjs';
import { OWNER_FEEDBACK_DIR } from './owner-feedback.mjs';
import { analyzeFailedProductionRun, proposalFromRootCause } from './root-cause.mjs';

const LEARNING_ROOT = path.join(ROOT, 'learning');
const DIRS = Object.freeze({
  aggregates: path.join(LEARNING_ROOT, 'aggregates'),
  triggers: path.join(LEARNING_ROOT, 'triggers'),
  analysis: path.join(LEARNING_ROOT, 'analysis'),
  rootCauses: path.join(LEARNING_ROOT, 'root-causes'),
  candidates: path.join(LEARNING_ROOT, 'candidates'),
  orchestration: path.join(LEARNING_ROOT, 'orchestration')
});

function stableKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function loadDurableEvidence() {
  const runEvidence = [];
  const attemptEvidence = [];

  for (const runDir of listDirs(PATHS.runs)) {
    const runFile = path.join(runDir, 'RUN-EVIDENCE.json');
    const run = readJson(runFile, null);
    if (run?.run?.id) runEvidence.push(run);
    const runId = String(run?.run?.id || path.basename(runDir));

    for (const attemptDir of listDirs(runDir).filter((dir) => /^attempt-\d+$/.test(path.basename(dir)))) {
      const attemptId = path.basename(attemptDir);
      const techFile = path.join(attemptDir, 'evidence-tech.json');
      const fidelityFile = path.join(attemptDir, 'evidence-fidelity.json');
      const tech = readJson(techFile, null);
      const fidelity = readJson(fidelityFile, null);
      if (tech?.contract) {
        attemptEvidence.push({
          runId,
          attemptId,
          kind: 'technical',
          sourceRef: relative(techFile),
          evidence: tech.contract
        });
      }
      if (fidelity) {
        attemptEvidence.push({
          runId,
          attemptId,
          kind: 'product-fidelity',
          sourceRef: relative(fidelityFile),
          evidence: fidelity
        });
      }
    }
  }

  const ownerFeedback = listJsonFiles(OWNER_FEEDBACK_DIR)
    .map((file) => readJson(file, null))
    .filter((record) => record?.id)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  runEvidence.sort((a, b) => String(a.run?.id || '').localeCompare(String(b.run?.id || '')));
  attemptEvidence.sort((a, b) => `${a.runId}:${a.attemptId}:${a.kind}`.localeCompare(`${b.runId}:${b.attemptId}:${b.kind}`));
  return { runEvidence, attemptEvidence, ownerFeedback };
}

function sourceRunIdsForFeedback(feedback, runEvidence) {
  const explicit = Array.isArray(feedback?.sourceRunIds) ? feedback.sourceRunIds.map(String).filter(Boolean) : [];
  if (explicit.length) return [...new Set(explicit)].sort();
  const candidateSha = String(feedback?.candidateSha || '').trim();
  if (!candidateSha) return [];
  return runEvidence
    .filter((run) => String(run?.run?.candidateSha || '') === candidateSha)
    .map((run) => String(run.run.id))
    .filter(Boolean)
    .sort();
}

function feedbackFact(feedback) {
  const reason = String(feedback?.parsedReason || '').replace(/\s+/g, ' ').trim();
  return reason
    ? `Owner ${feedback.parsedCommand} evidence ${feedback.id} contains a preserved reason (${reason.slice(0, 240)}${reason.length > 240 ? '…' : ''}).`
    : `Owner ${feedback?.parsedCommand || 'feedback'} evidence ${feedback?.id || 'unknown'} was captured without an interpreted reason.`;
}

function buildProposal({ eventKind, eventId, trigger, aggregate, durable, candidateId, rootCause }) {
  if (eventKind === 'owner-feedback' && trigger.allowedScopes?.includes('product-feedback')) {
    const feedback = durable.ownerFeedback.find((item) => item.id === eventId);
    if (!feedback) throw new Error(`owner-feedback event not found: ${eventId}`);
    const sourceRunIds = sourceRunIdsForFeedback(feedback, durable.runEvidence);
    if (!sourceRunIds.length) {
      return {
        scope: 'product-feedback',
        blocked: 'owner feedback has no durable source-run provenance',
        facts: [feedbackFact(feedback)]
      };
    }
    return {
      scope: 'product-feedback',
      facts: [
        feedbackFact(feedback),
        `Source run provenance: ${sourceRunIds.join(', ')}.`,
        'No missing Owner requirement is inferred automatically from this evidence.'
      ],
      proposal: {
        id: candidateId,
        role: 'director',
        scope: 'product-feedback',
        targetLayer: 'owner-contract',
        text: `Hypothesis only: Owner feedback ${eventId} may indicate an intake or Owner Contract decomposition gap. Validate the preserved brief, requirement decomposition, and product evidence before changing Production. Do not infer or invent missing requirements from this feedback alone.`,
        sourceRunIds,
        sourceKind: 'controlled-learning-orchestration',
        ownerFeedbackIds: [eventId],
        candidateSha: feedback.candidateSha || null,
        confidence: 0.4,
        evidenceCount: 1,
        createdAt: feedback.createdAt || undefined
      }
    };
  }

  if (eventKind === 'production-run' && trigger.allowedScopes?.includes('case-root-cause') && rootCause) {
    const proposal = proposalFromRootCause(rootCause, candidateId);
    return {
      scope: 'case-root-cause',
      facts: [
        `Failed production run ${eventId} was analyzed from durable run/attempt evidence without an additional LLM call.`,
        `Attempt failure trajectory: ${rootCause.trajectory.join(' -> ') || 'no attempt evidence'}.`,
        `Best attempt: ${rootCause.bestAttempt || 'unknown'}; final attempt: ${rootCause.finalAttempt || 'unknown'}.`,
        `Evidence-backed findings: ${rootCause.findings.map((item) => `${item.id}@${item.confidence}`).join(', ') || 'none above deterministic threshold'}.`
      ],
      proposal,
      blocked: proposal ? null : 'no bounded root-cause hypothesis crossed the deterministic evidence threshold'
    };
  }

  if (eventKind === 'production-run' && trigger.allowedScopes?.includes('engineering')) {
    const recurring = (aggregate?.failures?.recurring || []).filter((item) =>
      Number(item.count) >= 2 &&
      Number(item.runCount) >= 2 &&
      Array.isArray(item.runIds) &&
      item.runIds.map(String).includes(String(eventId))
    );
    const sourceRunIds = [...new Set(recurring.flatMap((item) => item.runIds || []))].map(String).sort();
    const signatures = recurring.map((item) => `${item.signature} x${item.count} across ${item.runCount} runs`);
    return {
      scope: 'engineering',
      facts: [
        `Recurring deterministic cross-run failure evidence involving current production event ${eventId}: ${signatures.join('; ') || 'none'}.`,
        `Independent source runs for those recurring signatures: ${sourceRunIds.length}.`
      ],
      proposal: {
        id: candidateId,
        role: 'engineer',
        scope: 'engineering',
        targetLayer: 'skill',
        text: `Hypothesis only: recurring deterministic verifier failures observed across independent runs including production event ${eventId} may indicate an engineering-guidance gap. Validate root cause against independent evidence and the full regression suite before proposing any skill change.`,
        sourceRunIds,
        sourceKind: 'controlled-learning-orchestration',
        ownerFeedbackIds: [],
        confidence: 0.4,
        evidenceCount: recurring.reduce((sum, item) => sum + Number(item.count || 0), 0)
      }
    };
  }

  return { scope: null, facts: [], proposal: null };
}

function ensureInactiveCandidate(trigger, proposal) {
  if (!proposal) return null;
  const file = path.join(DIRS.candidates, `${proposal.id}.json`);
  const existing = readJson(file, null);
  if (existing) {
    if (existing.active === true || !['candidate', 'validated'].includes(existing.status)) {
      throw new Error(`existing learning candidate is not safely inactive: ${proposal.id}`);
    }
    return existing;
  }
  const candidate = persistImprovementClaim({ trigger, proposal });
  if (candidate.active !== false || candidate.status !== 'candidate') {
    throw new Error(`automatic orchestration created non-inactive candidate: ${proposal.id}`);
  }
  return candidate;
}

export function orchestrateControlledLearning({ eventKind, eventId } = {}) {
  const kind = String(eventKind || '').trim();
  const id = String(eventId || '').trim();
  if (!['production-run', 'owner-feedback'].includes(kind)) throw new Error(`unsupported learning event kind: ${kind || '(empty)'}`);
  if (!id) throw new Error('learning event id is required');

  const eventIdentity = `${kind}:${id}`;
  const key = stableKey(eventIdentity);
  const artifactId = `auto-${kind}-${key}`;
  const aggregateFile = path.join(DIRS.aggregates, `${artifactId}.json`);
  const triggerFile = path.join(DIRS.triggers, `${artifactId}.json`);
  const analysisFile = path.join(DIRS.analysis, `${artifactId}.json`);
  const rootCauseFile = path.join(DIRS.rootCauses, `${artifactId}.json`);
  const receiptFile = path.join(DIRS.orchestration, `${artifactId}.json`);

  const existingReceipt = readJson(receiptFile, null);
  if (existingReceipt) {
    const candidateId = existingReceipt.candidateId || null;
    if (candidateId) {
      const candidate = readJson(path.join(DIRS.candidates, `${candidateId}.json`), null);
      if (!candidate || candidate.active === true) throw new Error(`orchestration receipt points to missing or active candidate: ${candidateId}`);
    }
    return { ...existingReceipt, created: false };
  }

  const durable = loadDurableEvidence();
  const eventRun = kind === 'production-run'
    ? durable.runEvidence.find((run) => String(run?.run?.id || '') === id)
    : null;
  if (kind === 'production-run' && !eventRun) throw new Error(`production-run evidence not found: ${id}`);
  if (kind === 'owner-feedback' && !durable.ownerFeedback.some((feedback) => feedback.id === id)) {
    throw new Error(`owner-feedback evidence not found: ${id}`);
  }

  const eventFeedback = kind === 'owner-feedback'
    ? durable.ownerFeedback.find((feedback) => feedback.id === id)
    : null;
  const eventFailed = kind === 'production-run' && String(eventRun?.run?.status || '').toLowerCase() === 'failed';
  const rootCause = eventFailed ? analyzeFailedProductionRun({ runId: id }) : null;
  if (rootCause) writeJson(rootCauseFile, rootCause);

  const aggregate = aggregateEvidence(durable);
  const trigger = evaluateImprovementTrigger(aggregate, {
    eventKind: kind,
    eventId: id,
    eventVerdict: eventFeedback?.parsedCommand || eventFeedback?.verdict || '',
    eventFailed
  });
  writeJson(aggregateFile, {
    ...aggregate,
    orchestration: { eventKind: kind, eventId: id, authority: 'deterministic-aggregation-only' }
  });
  writeJson(triggerFile, {
    ...trigger,
    eventKind: kind,
    eventId: id,
    eventFailed,
    aggregateRef: relative(aggregateFile),
    rootCauseRef: rootCause ? relative(rootCauseFile) : null
  });

  const candidateId = `candidate-${kind}-${key}`;
  const bounded = trigger.allowed
    ? buildProposal({ eventKind: kind, eventId: id, trigger, aggregate, durable, candidateId, rootCause })
    : { scope: null, facts: [], proposal: null };
  const candidate = ensureInactiveCandidate(trigger, bounded.proposal || null);

  if (trigger.allowed && bounded.scope) {
    writeJson(analysisFile, {
      schemaVersion: 'improvement-analysis-v1',
      id: artifactId,
      triggerRef: relative(triggerFile),
      aggregateRef: relative(aggregateFile),
      rootCauseRef: rootCause ? relative(rootCauseFile) : null,
      event: { kind, id },
      scope: bounded.scope,
      authority: IMPROVEMENT_AUTHORITY,
      facts: bounded.facts,
      findingIds: rootCause?.findings?.map((item) => item.id) || [],
      conclusion: bounded.blocked
        ? `Analysis stopped safely: ${bounded.blocked}.`
        : candidate
          ? `Evidence supports one inactive hypothesis candidate (${candidate.id}); validation and activation remain prohibited.`
          : 'Trigger was allowed, but this event does not authorize a candidate scope.',
      candidateId: candidate?.id || null,
      blocked: bounded.blocked || null,
      canValidate: false,
      canActivate: false
    });
  }

  const receipt = {
    schemaVersion: 'controlled-learning-orchestration-v1',
    eventKind: kind,
    eventId: id,
    aggregateRef: relative(aggregateFile),
    triggerRef: relative(triggerFile),
    rootCauseRef: rootCause ? relative(rootCauseFile) : null,
    analysisRef: trigger.allowed && bounded.scope ? relative(analysisFile) : null,
    triggerAllowed: trigger.allowed,
    triggerReasons: trigger.reasons,
    focusScope: bounded.scope || null,
    candidateId: candidate?.id || null,
    candidateActive: candidate?.active ?? null,
    canValidate: false,
    canActivate: false
  };
  writeJson(receiptFile, receipt);
  return { ...receipt, created: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const result = orchestrateControlledLearning({
    eventKind: process.env.GF_LEARNING_EVENT_KIND,
    eventId: process.env.GF_LEARNING_EVENT_ID
  });
  console.log(JSON.stringify(result));
}
