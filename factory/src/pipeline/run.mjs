import path from 'node:path';
import fs from 'node:fs';
import { LIMITS, PATHS } from '../config.mjs';
import { log } from '../util/log.mjs';
import { ensureDir, writeJson, writeText, sha256 } from '../util/fsx.mjs';
import { slugify } from '../util/slug.mjs';
import { runDirector } from '../roles/director.mjs';
import { buildGame, rebuildGame, repairGame, polishGame } from '../roles/engineer.mjs';
import { runPlaytester } from '../roles/playtester.mjs';
import { runAuditor } from '../roles/auditor.mjs';
import { runSession } from '../verify/harness.mjs';
import { evaluateContract } from '../verify/contract.mjs';
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
  return {
    attempt: evidence.attempt,
    contractFailures: evidence.contract.failures,
    consoleErrors: (evidence.consoleErrors || []).slice(0, 8),
    pageErrors: (evidence.pageErrors || []).slice(0, 8),
    probeErrors: (evidence.probeErrors || []).slice(0, 8),
    fps: evidence.fps,
    states: evidence.states
  };
}

function failureSignature(bundle) {
  return JSON.stringify({
    failures: bundle.contractFailures.map((f) => [f.id, f.detail || '']),
    consoleErrors: bundle.consoleErrors.slice(0, 3),
    pageErrors: bundle.pageErrors.slice(0, 3),
    probeErrors: bundle.probeErrors.slice(0, 3)
  });
}

function summarizeFailure(bundle) {
  const lines = [
    `Attempt ${bundle.attempt} failed the technical contract.`, '', 'Failed checks:',
    ...bundle.contractFailures.map((f) => `- [${f.id}] ${f.label} :: ${f.detail || 'no detail'}`)
  ];
  if (bundle.consoleErrors.length) lines.push('', 'Console errors:', ...bundle.consoleErrors.map((e) => '- ' + e));
  if (bundle.pageErrors.length) lines.push('', 'Page errors:', ...bundle.pageErrors.map((e) => '- ' + e));
  if (bundle.probeErrors.length) lines.push('', 'Probe-reported game errors:', ...bundle.probeErrors.map((e) => '- ' + e));
  lines.push('', `Measured FPS: ${bundle.fps ?? 'n/a'} | states: mid=${bundle.states?.mid?.state} -> end=${bundle.states?.end?.state}, score ${bundle.states?.mid?.score} -> ${bundle.states?.end?.score}`);
  lines.push('', 'Reminder: score must increase deterministically under ordinary simulated keyboard/mouse input within the first few seconds; do not rely on lucky random collisions or rare events. No runtime errors are allowed.');
  return lines.join('\n');
}

async function verifyAttempt({ runDir, attempt, design }) {
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
  const evidence = {
    attempt,
    candidateSha: sha256(html),
    fps: report.fps,
    states: { mid: report.midSnapshot, end: report.endSnapshot },
    contract: verdict,
    consoleErrors: report.consoleErrors.slice(0, 10),
    pageErrors: report.pageErrors.slice(0, 10),
    probeErrors: (report.endSnapshot?.errors || []).slice(0, 10)
  };
  writeJson(path.join(dir, 'evidence-tech.json'), evidence);
  return { dir, html, report, verdict, evidence };
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
  const evidence = writeUnifiedEvidence(runDir, state, 'failed', reason);
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
  const state = {
    runId,
    source,
    candidateSha: null,
    technical: { pass: false, checks: null },
    // L3 will replace this fail-closed placeholder with verifier-backed fidelity evidence.
    productFidelity: { pass: false, status: 'pending-l3', criteria: null },
    experience: { score: null, scores: null, critique: [] },
    audit: null,
    counters: { attempts: 0, repairCalls: 0, polishRounds: 0, freshRebuilds: 0 }
  };
  writeJson(path.join(runDir, 'brief.json'), { idea, source, startedAt: new Date().toISOString(), budgetUsd });

  log.step('PHASE A - DIRECTING');
  let gdd;
  try {
    gdd = await runDirector({ idea, source });
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
        design = await buildGame({ gdd, ownerIdea: idea });
      } else if (forceFreshRebuild) {
        log.warn('repair stagnation detected: discarding previous architecture and rebuilding fresh');
        design = await rebuildGame({ gdd, ownerIdea: idea, failureHistory: escalationHistory.slice(-4) });
        state.counters.freshRebuilds++;
        forceFreshRebuild = false;
      } else {
        design = await repairGame({
          gdd, design, ownerIdea: idea,
          failureSummary: summarizeFailure(failureBundles[failureBundles.length - 1])
        });
        state.counters.repairCalls++;
      }
    } catch (e) {
      return failClosed(runDir, state, llmFailureReason(e, 'engineer_invalid_output'), { error: String(e.message), attempt });
    }

    tech = await verifyAttempt({ runDir, attempt, design });
    state.candidateSha = tech.evidence.candidateSha;
    state.technical = { pass: tech.verdict.passed, checks: tech.verdict.checks };
    if (tech.verdict.passed) break;

    const bundle = failureBundle(tech.evidence);
    const signature = failureSignature(bundle);
    const candidateSha = tech.evidence.candidateSha;
    const sameFailure = lastFailureSignature !== null && signature === lastFailureSignature;
    const sameCandidate = lastCandidateSha !== null && candidateSha === lastCandidateSha;
    failureBundles.push(bundle);
    log.warn(`attempt ${attempt} failed contract (${tech.verdict.failures.length} checks)`);
    for (const f of tech.verdict.failures) log.warn(`  FAILED CHECK [${f.id}] ${f.label} :: ${f.detail || 'no detail'}`);

    if (sameFailure || sameCandidate) {
      const trigger = [sameFailure ? 'same failure signature' : null, sameCandidate ? 'identical candidate' : null].filter(Boolean).join(' + ');
      escalationHistory.push(`${trigger}: ${summarizeFailure(bundle)}`);
      forceFreshRebuild = true;
      log.warn(`repair made no meaningful progress (${trigger}); next attempt will use fresh rebuild escalation`);
    }
    lastFailureSignature = signature;
    lastCandidateSha = candidateSha;
  }

  if (!tech?.verdict.passed) {
    return failClosed(runDir, state, 'debug_exhausted', { attempts: attempt, bundles: failureBundles, escalations: escalationHistory });
  }
  log.info('technical contract PASSED');

  let playtest = null;
  let polishRounds = 0;
  const polishRegressionNotes = [];
  for (;;) {
    log.step(`PHASE C - PLAYTEST (round ${polishRounds})`);
    const gameplayShots = (tech.report._images || []).filter((s) => s.name !== 'shot-1-title').slice(-3);
    const metrics = {
      fps: tech.report.fps,
      durationSeconds: LIMITS.playSeconds,
      stateMid: tech.report.midSnapshot?.state,
      stateEnd: tech.report.endSnapshot?.state,
      scoreMid: tech.report.midSnapshot?.score,
      scoreEnd: tech.report.endSnapshot?.score,
      bestScore: tech.report.endSnapshot?.best
    };
    try {
      playtest = await runPlaytester({ metrics, images: gameplayShots });
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
      design = await polishGame({ gdd, design, playtest, ownerIdea: idea, regressionNotes: polishRegressionNotes });
    } catch (e) {
      return failClosed(runDir, state, llmFailureReason(e, 'engineer_polish_invalid'), { error: String(e.message) });
    }
    attempt++;
    state.counters.attempts = attempt;
    tech = await verifyAttempt({ runDir, attempt, design });
    state.candidateSha = tech.evidence.candidateSha;
    state.technical = { pass: tech.verdict.passed, checks: tech.verdict.checks };
    let repairs = 0;
    while (!tech.verdict.passed && repairs < 2) {
      repairs++;
      failureBundles.push(failureBundle(tech.evidence));
      try {
        design = await repairGame({
          gdd, design, ownerIdea: idea,
          failureSummary: summarizeFailure(failureBundles[failureBundles.length - 1])
        });
        state.counters.repairCalls++;
      } catch (e) {
        return failClosed(runDir, state, llmFailureReason(e, 'engineer_repair_invalid'), { error: String(e.message), polishRound: polishRounds });
      }
      attempt++;
      state.counters.attempts = attempt;
      tech = await verifyAttempt({ runDir, attempt, design });
      state.candidateSha = tech.evidence.candidateSha;
      state.technical = { pass: tech.verdict.passed, checks: tech.verdict.checks };
    }
    if (!tech.verdict.passed) {
      const regressionSummary = tech.verdict.failures.map((f) => `[${f.id}] ${f.detail || f.label}`).join(' | ');
      polishRegressionNotes.push(`Round ${polishRounds}: ${regressionSummary}`);
      log.warn(`polish round ${polishRounds} regressed the technical contract after ${repairs} repair attempts; restoring last verified candidate and trying the next polish round`);
      design = stableDesign;
      tech = stableTech;
      state.candidateSha = tech.evidence.candidateSha;
      state.technical = { pass: true, checks: tech.verdict.checks };
      continue;
    }
    log.info(`polish round ${polishRounds} preserved technical contract`);
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
    attemptsTotal: attempt,
    debugRepairRounds: failureBundles.length,
    polishRounds,
    finalTechnicalChecks: tech.verdict.checks,
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

  // L1 deterministic release authority. Until L3 supplies real fidelity evidence,
  // Product Fidelity remains false and production fails closed here by design.
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
    candidateSha: tech.evidence.candidateSha
  });
  writeJson(path.join(runDir, 'RESULT.json'), { status: 'success', slug, meta, evidenceSchema: unified.schema });
  log.info(`draft ready: drafts/${slug}`);
  return { status: 'success', slug, runDir, meta };
}
