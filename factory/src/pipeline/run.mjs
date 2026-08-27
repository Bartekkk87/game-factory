import path from 'node:path';
import fs from 'node:fs';
import { LIMITS, PATHS } from '../config.mjs';
import { log } from '../util/log.mjs';
import { ensureDir, writeJson, writeText, sha256 } from '../util/fsx.mjs';
import { slugify } from '../util/slug.mjs';
import { createOwnerContract } from '../contract/owner.mjs';
import { runDirector } from '../roles/director.mjs';
import { buildGame, rebuildGame, repairGame, polishGame } from '../roles/engineer.mjs';
import { runPlaytester } from '../roles/playtester.mjs';
import { runAuditor } from '../roles/auditor.mjs';
import { runSession } from '../verify/harness.mjs';
import { evaluateContract } from '../verify/contract.mjs';
import { evaluateProductFidelity } from '../verify/fidelity.mjs';
import { assemble } from '../publish/assemble.mjs';
import { registerProduct, bumpStats } from '../memory/store.mjs';
import { beginRunBudget, costReport } from '../llm/client.mjs';
import { evaluateReleaseGate } from '../control/release-gate.mjs';
import { createRunEvidence } from '../control/evidence.mjs';

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function failureBundle(evidence) {
  const technicalFailures = (evidence.contract?.failures || []).map((failure) => ({
    id: failure.id,
    label: failure.label,
    detail: failure.detail || '',
    gate: 'technical'
  }));
  const fidelityFailures = (evidence.productFidelity?.failures || []).map((failure) => ({
    id: `fidelity_${failure.requirementId}`,
    label: `Owner requirement ${failure.requirementId}`,
    detail: `${failure.acceptanceId}/${failure.probeId}: ${failure.detail || 'not proven'}`,
    gate: 'product-fidelity'
  }));
  return {
    attempt: evidence.attempt,
    failures: [...technicalFailures, ...fidelityFailures],
    technicalFailures,
    fidelityFailures,
    consoleErrors: (evidence.consoleErrors || []).slice(0, 8),
    pageErrors: (evidence.pageErrors || []).slice(0, 8),
    probeErrors: (evidence.probeErrors || []).slice(0, 8),
    fps: evidence.fps,
    states: evidence.states
  };
}

function failureSignature(bundle) {
  return JSON.stringify({
    failures: bundle.failures.map((f) => [f.id, f.detail || '']),
    consoleErrors: bundle.consoleErrors.slice(0, 3),
    pageErrors: bundle.pageErrors.slice(0, 3),
    probeErrors: bundle.probeErrors.slice(0, 3)
  });
}

function summarizeFailure(bundle) {
  const lines = [
    `Attempt ${bundle.attempt} failed verification.`, '', 'Failed checks:',
    ...bundle.failures.map((f) => `- [${f.id}] ${f.label} :: ${f.detail || 'no detail'}`)
  ];
  if (bundle.consoleErrors.length) lines.push('', 'Console errors:', ...bundle.consoleErrors.map((e) => '- ' + e));
  if (bundle.pageErrors.length) lines.push('', 'Page errors:', ...bundle.pageErrors.map((e) => '- ' + e));
  if (bundle.probeErrors.length) lines.push('', 'Probe-reported game errors:', ...bundle.probeErrors.map((e) => '- ' + e));
  const states = bundle.states || {};
  lines.push('', `Measured FPS: ${bundle.fps ?? 'n/a'} | timeline: start=${states.start?.state}/${states.start?.score} -> early=${states.early?.state}/${states.early?.score} -> mid=${states.mid?.state}/${states.mid?.score} -> end=${states.end?.state}/${states.end?.score}`);
  lines.push('', 'Reminder: technical checks and every Owner Contract requirement must be proven by the fixed verifier seed/input sequence and start/early/mid/end evidence. Do not rely on lucky random collisions, rare events or prose claims.');
  return lines.join('\n');
}

function applyVerificationState(state, verified) {
  state.candidateSha = verified.evidence.candidateSha;
  state.technical = { pass: verified.verdict.passed, checks: verified.verdict.checks };
  state.productFidelity = {
    pass: verified.fidelity.pass,
    status: verified.fidelity.status,
    contractSha256: verified.fidelity.contractSha256,
    criteria: verified.fidelity.criteria
  };
}

async function verifyAttempt({ runDir, attempt, design, ownerContract, gdd }) {
  const dir = path.join(runDir, `attempt-${String(attempt).padStart(2, '0')}`);
  ensureDir(dir);
  const html = assemble(design);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  writeJson(path.join(dir, 'design.json'), design);

  let bgColor = '#101010';
  const bgMatch = design.js?.match(/background\s*:\s*['"`]([^'"`]+)['"`]/);
  if (bgMatch) bgColor = bgMatch[1];
  else {
    const cssBg = design.css?.match(/background\s*:\s*([^;}]+)/);
    if (cssBg) bgColor = cssBg[1].trim();
  }

  log.info(`verifying attempt ${attempt} (sha ${sha256(html).slice(0, 12)}) ...`);
  const report = await runSession({ root: dir, seconds: LIMITS.playSeconds, screenshotDir: path.join(dir, 'shots') });
  const verdict = await evaluateContract(report, { bgColor });
  const fidelity = evaluateProductFidelity({ ownerContract, gdd, report });
  const evidence = {
    attempt,
    candidateSha: sha256(html),
    ownerContractSha256: ownerContract.contractSha256,
    seed: report.seed,
    inputSequence: report.inputSequence,
    telemetry: report.timeline,
    fps: report.fps,
    states: {
      start: report.startSnapshot,
      early: report.earlySnapshot,
      mid: report.midSnapshot,
      end: report.endSnapshot
    },
    contract: verdict,
    productFidelity: fidelity,
    consoleErrors: report.consoleErrors.slice(0, 10),
    pageErrors: report.pageErrors.slice(0, 10),
    probeErrors: (report.endSnapshot?.errors || []).slice(0, 10)
  };
  writeJson(path.join(dir, 'telemetry.json'), {
    seed: report.seed,
    inputSequence: report.inputSequence,
    timeline: report.timeline
  });
  writeJson(path.join(dir, 'evidence-tech.json'), evidence);
  writeJson(path.join(dir, 'evidence-fidelity.json'), fidelity);
  return { dir, html, report, verdict, fidelity, passed: verdict.passed && fidelity.pass, evidence };
}

function releaseFor(state) {
  const budget = costReport();
  return evaluateReleaseGate({
    technical: state.technical,
    productFidelity: state.productFidelity,
    experienceScore: state.experience?.score,
    budget,
    minExperience: LIMITS.minOverallScore
  });
}

function writeUnifiedEvidence(runDir, state, status, reason = null, artifacts = {}) {
  const budget = costReport();
  const releaseGate = releaseFor(state);
  const evidence = createRunEvidence({
    runId: state.runId,
    status,
    reason,
    source: state.source,
    candidateSha: state.candidateSha,
    technical: state.technical,
    productFidelity: state.productFidelity,
    experience: state.experience,
    budget,
    releaseGate,
    audit: state.audit,
    counters: state.counters,
    artifacts
  });
  writeJson(path.join(runDir, 'RUN-EVIDENCE.json'), evidence);
  return evidence;
}

function failClosed(runDir, state, reason, extra = {}) {
  const evidence = writeUnifiedEvidence(runDir, state, 'failed', reason, { ownerContract: 'owner-contract.json' });
  const payload = { reason, closedAt: new Date().toISOString(), cost: costReport(), releaseGate: evidence.gates.release, ...extra };
  writeJson(path.join(runDir, 'FAILURE.json'), payload);
  bumpStats({ failed: 1 });
  log.error(`FAIL-CLOSED: ${reason}`);
  return { status: 'failed', reason, runDir };
}

function llmFailureReason(error, fallback) {
  return error?.code === 'BUDGET_BLOCKED' ? 'budget_blocked' : fallback;
}

function reviewMarkdown(meta) {
  return [
    `## Review needed: ${meta.title}`, '',
    `**Preview:** \`drafts/${meta.slug}/index.html\` (live on Pages after push)`, '',
    `> ${meta.tagline}`, '',
    '| Metric | Value |',
    `| Release gate | **${meta.releaseGate.pass ? 'PASS' : 'FAIL'}** |`,
    `| Product fidelity | **${meta.productFidelity.pass ? 'PASS' : 'FAIL'}** |`,
    `| Playtest overall | **${meta.overall} / 10** |`,
    `| Visuals / UI / Fun / Perf | ${meta.scores.visuals} / ${meta.scores.uiClarity} / ${meta.scores.funProxy} / ${meta.scores.performance} |`,
    `| Attempts (build+debug) | ${meta.attempts} |`,
    `| Polish rounds | ${meta.polishRounds} |`,
    `| Candidate SHA | \`${meta.candidateSha.slice(0, 16)}\` |`, '',
    '**Audit summary (advisory):** ' + meta.auditSummary, '',
    '**Top critique:**', ...(meta.critique.slice(0, 4).map((c) => '- ' + c)), '', '---',
    `Approve with comment \`/approve\` or reject with \`/reject <reason>\` on this issue.`, '', `[slug:${meta.slug}]`
  ].join('\n');
}

export async function produceGame({ idea = '', source = 'chat', budgetUsd = LIMITS.budgetUsd }) {
  bumpStats({ runs: 1 });
  const runId = stamp();
  const runDir = path.join(PATHS.runs, runId);
  ensureDir(runDir);
  beginRunBudget({
    runId,
    budgetUsd,
    stageBudgets: {
      repair: { maxCalls: LIMITS.maxRepairCalls, maxUsd: LIMITS.repairBudgetUsd },
      polish: { maxCalls: LIMITS.maxPolishRounds, maxUsd: LIMITS.polishBudgetUsd },
      freshRebuild: { maxCalls: LIMITS.maxFreshRebuilds, maxUsd: LIMITS.freshRebuildBudgetUsd }
    }
  });

  const ownerContract = createOwnerContract({ idea, source });
  writeJson(path.join(runDir, 'owner-contract.json'), ownerContract);
  const state = {
    runId,
    source,
    candidateSha: null,
    technical: { pass: false, checks: null },
    productFidelity: {
      pass: false,
      status: 'pending-verification',
      contractSha256: ownerContract.contractSha256,
      criteria: null
    },
    experience: { score: null, scores: null, critique: [] },
    audit: null,
    counters: { attempts: 0, repairCalls: 0, polishRounds: 0, freshRebuilds: 0 }
  };
  writeJson(path.join(runDir, 'brief.json'), { idea, source, startedAt: new Date().toISOString(), budgetUsd, ownerContractSha256: ownerContract.contractSha256 });

  log.step('PHASE A - DIRECTING');
  let gdd;
  try {
    gdd = await runDirector({ idea, source, ownerContract });
  } catch (e) {
    return failClosed(runDir, state, llmFailureReason(e, 'director_failed'), { error: String(e.message) });
  }
  const slug = slugify(gdd.title);
  writeJson(path.join(runDir, 'gdd.json'), gdd);
  log.info(`concept: "${gdd.title}" (${gdd.genre}) -> run ${path.basename(runDir)}`);

  let design = null;
  let tech = null;
  const failureBundles = [];
  const escalationHistory = [];
  let lastFailureSignature = null;
  let lastCandidateSha = null;
  let forceFreshRebuild = false;
  let attempt = 0;

  for (attempt = 1; attempt <= LIMITS.maxDebugRounds + 1; attempt++) {
    state.counters.attempts = attempt;
    log.step(`PHASE B - BUILD & VERIFY (attempt ${attempt}/${LIMITS.maxDebugRounds + 1})`);
    try {
      if (attempt === 1) {
        design = await buildGame({ gdd, ownerIdea: idea, ownerContract });
      } else if (forceFreshRebuild) {
        log.warn('repair stagnation detected: discarding previous architecture and rebuilding fresh');
        design = await rebuildGame({ gdd, ownerIdea: idea, ownerContract, failureHistory: escalationHistory.slice(-4) });
        state.counters.freshRebuilds++;
        forceFreshRebuild = false;
      } else {
        design = await repairGame({
          gdd, design, ownerIdea: idea, ownerContract,
          failureSummary: summarizeFailure(failureBundles[failureBundles.length - 1])
        });
        state.counters.repairCalls++;
      }
    } catch (e) {
      return failClosed(runDir, state, llmFailureReason(e, 'engineer_invalid_output'), { error: String(e.message), attempt });
    }

    tech = await verifyAttempt({ runDir, attempt, design, ownerContract, gdd });
    applyVerificationState(state, tech);
    if (tech.passed) break;

    const bundle = failureBundle(tech.evidence);
    const signature = failureSignature(bundle);
    const candidateSha = tech.evidence.candidateSha;
    const sameFailure = lastFailureSignature !== null && signature === lastFailureSignature;
    const sameCandidate = lastCandidateSha !== null && candidateSha === lastCandidateSha;
    failureBundles.push(bundle);
    log.warn(`attempt ${attempt} failed verification (${bundle.failures.length} checks)`);
    for (const f of bundle.failures) log.warn(`  FAILED CHECK [${f.id}] ${f.label} :: ${f.detail || 'no detail'}`);

    if (sameFailure || sameCandidate) {
      const trigger = [sameFailure ? 'same failure signature' : null, sameCandidate ? 'identical candidate' : null].filter(Boolean).join(' + ');
      escalationHistory.push(`${trigger}: ${summarizeFailure(bundle)}`);
      forceFreshRebuild = true;
      log.warn(`repair made no meaningful progress (${trigger}); next attempt will use fresh rebuild escalation`);
    }
    lastFailureSignature = signature;
    lastCandidateSha = candidateSha;
  }

  if (!tech?.passed) {
    return failClosed(runDir, state, 'debug_exhausted', { attempts: attempt, bundles: failureBundles, escalations: escalationHistory });
  }
  log.info('technical contract + product fidelity PASSED');

  let playtest = null;
  let polishRounds = 0;
  const polishRegressionNotes = [];
  for (;;) {
    log.step(`PHASE C - PLAYTEST (round ${polishRounds})`);
    const gameplayShots = (tech.report._images || []).filter((s) => s.name !== 'shot-1-title').slice(-3);
    const metrics = {
      fps: tech.report.fps,
      durationSeconds: LIMITS.playSeconds,
      stateStart: tech.report.startSnapshot?.state,
      stateEarly: tech.report.earlySnapshot?.state,
      stateMid: tech.report.midSnapshot?.state,
      stateEnd: tech.report.endSnapshot?.state,
      scoreStart: tech.report.startSnapshot?.score,
      scoreEarly: tech.report.earlySnapshot?.score,
      scoreMid: tech.report.midSnapshot?.score,
      scoreEnd: tech.report.endSnapshot?.score,
      bestScore: tech.report.endSnapshot?.best,
      verifierSeed: tech.report.seed
    };
    try {
      playtest = await runPlaytester({
        metrics,
        images: gameplayShots,
        ownerContract,
        gdd,
        telemetry: tech.report.timeline,
        runtimeEvents: tech.fidelity.observedEvents,
        deterministicProductFidelity: {
          pass: tech.fidelity.pass,
          status: tech.fidelity.status,
          criteria: tech.fidelity.criteria
        }
      });
    } catch (e) {
      return failClosed(runDir, state, llmFailureReason(e, 'playtester_failed'), { error: String(e.message) });
    }
    writeJson(path.join(runDir, `evidence-exp-${polishRounds}.json`), playtest);
    state.experience = { score: playtest.overall, scores: playtest.scores, critique: playtest.critique ?? [] };
    log.info(`overall score ${playtest.overall}/10 (gate ${LIMITS.minOverallScore})`);

    if (playtest.overall >= LIMITS.minOverallScore) break;
    if (polishRounds >= LIMITS.maxPolishRounds) break;

    polishRounds++;
    state.counters.polishRounds = polishRounds;
    log.step(`PHASE C - POLISH ROUND ${polishRounds}/${LIMITS.maxPolishRounds}`);
    const stableDesign = design;
    const stableTech = tech;
    try {
      design = await polishGame({ gdd, design, playtest, ownerIdea: idea, ownerContract, regressionNotes: polishRegressionNotes });
    } catch (e) {
      return failClosed(runDir, state, llmFailureReason(e, 'engineer_polish_invalid'), { error: String(e.message) });
    }
    attempt++;
    state.counters.attempts = attempt;
    tech = await verifyAttempt({ runDir, attempt, design, ownerContract, gdd });
    applyVerificationState(state, tech);
    let repairs = 0;
    while (!tech.passed && repairs < 2) {
      repairs++;
      failureBundles.push(failureBundle(tech.evidence));
      try {
        design = await repairGame({
          gdd, design, ownerIdea: idea, ownerContract,
          failureSummary: summarizeFailure(failureBundles[failureBundles.length - 1])
        });
        state.counters.repairCalls++;
      } catch (e) {
        return failClosed(runDir, state, llmFailureReason(e, 'engineer_repair_invalid'), { error: String(e.message), polishRound: polishRounds });
      }
      attempt++;
      state.counters.attempts = attempt;
      tech = await verifyAttempt({ runDir, attempt, design, ownerContract, gdd });
      applyVerificationState(state, tech);
    }
    if (!tech.passed) {
      const regressionBundle = failureBundle(tech.evidence);
      const regressionSummary = regressionBundle.failures.map((f) => `[${f.id}] ${f.detail || f.label}`).join(' | ');
      polishRegressionNotes.push(`Round ${polishRounds}: ${regressionSummary}`);
      log.warn(`polish round ${polishRounds} regressed verification after ${repairs} repair attempts; restoring last fully verified candidate and trying the next polish round`);
      design = stableDesign;
      tech = stableTech;
      applyVerificationState(state, tech);
      continue;
    }
    log.info(`polish round ${polishRounds} preserved technical + product fidelity contracts`);
  }

  if (!playtest || playtest.overall < LIMITS.minOverallScore) {
    return failClosed(runDir, state, 'experience_gate_not_met', {
      overall: playtest?.overall ?? null,
      required: LIMITS.minOverallScore,
      polishRounds,
      polishRegressions: polishRegressionNotes
    });
  }

  log.step('PHASE C - AUDIT (ADVISORY)');
  const beforeAudit = costReport();
  const digest = {
    product: { title: gdd.title, genre: gdd.genre },
    ownerContractSha256: ownerContract.contractSha256,
    attemptsTotal: attempt,
    debugRepairRounds: failureBundles.length,
    polishRounds,
    finalTechnicalChecks: tech.verdict.checks,
    finalProductFidelity: tech.fidelity.criteria,
    playtestScores: playtest.scores,
    playtestOverall: playtest.overall,
    scoreGate: LIMITS.minOverallScore,
    budgetUsd,
    spentUsd: beforeAudit.costUsd,
    tokensUsed: beforeAudit.tokens
  };
  try {
    state.audit = await runAuditor({ digest });
    log.info(`audit verdict (advisory): ${state.audit.verdict}`);
  } catch (e) {
    state.audit = { verdict: 'UNAVAILABLE', summary: String(e.message) };
    log.warn(`auditor unavailable (non-authoritative): ${e.message}`);
  }

  const finalRelease = releaseFor(state);
  if (!finalRelease.pass) {
    return failClosed(runDir, state, 'release_gate_not_met', { releaseGate: finalRelease });
  }

  log.step('PHASE D - PUBLISH DRAFT');
  const draftDir = path.join(PATHS.drafts, slug);
  ensureDir(draftDir);
  fs.writeFileSync(path.join(draftDir, 'index.html'), tech.html);
  for (const shot of (tech.report._images || []).filter((s) => s.name !== 'shot-1-title')) {
    const b64 = shot.dataUrl.split(',')[1];
    fs.writeFileSync(path.join(draftDir, `${shot.name}.png`), Buffer.from(b64, 'base64'));
  }
  const cost = costReport();
  const meta = {
    slug,
    title: gdd.title,
    tagline: gdd.tagline ?? '',
    genre: gdd.genre ?? null,
    date: new Date().toISOString(),
    status: 'awaiting-review',
    previewPath: `drafts/${slug}/index.html`,
    candidateSha: tech.evidence.candidateSha,
    ownerContractSha256: ownerContract.contractSha256,
    productFidelity: state.productFidelity,
    attempts: attempt,
    debugRepairRounds: failureBundles.length,
    polishRounds,
    scores: playtest.scores,
    overall: playtest.overall,
    critique: playtest.critique ?? [],
    auditVerdict: state.audit?.verdict ?? 'UNAVAILABLE',
    auditSummary: state.audit?.summary ?? '',
    releaseGate: finalRelease,
    budget: cost,
    costUsd: cost.costUsd,
    tokens: cost.tokens
  };
  writeJson(path.join(draftDir, 'meta.json'), meta);
  writeText(path.join(draftDir, 'REVIEW.md'), reviewMarkdown(meta));
  registerProduct({ slug, title: gdd.title, genre: gdd.genre, date: meta.date, status: 'draft', score: playtest.overall });

  const unified = writeUnifiedEvidence(runDir, state, 'release-eligible', null, {
    draft: `drafts/${slug}`,
    candidateSha: tech.evidence.candidateSha,
    ownerContract: 'owner-contract.json'
  });
  writeJson(path.join(runDir, 'RESULT.json'), { status: 'success', slug, meta, evidenceSchema: unified.schema });
  log.info(`draft ready: drafts/${slug}`);
  return { status: 'success', slug, runDir, meta };
}