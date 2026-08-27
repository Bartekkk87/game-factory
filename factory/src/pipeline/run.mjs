import path from 'node:path';
import fs from 'node:fs';
import { LIMITS, PATHS } from '../config.mjs';
import { log } from '../util/log.mjs';
import { ensureDir, writeJson, writeText, sha256 } from '../util/fsx.mjs';
import { slugify } from '../util/slug.mjs';
import { runDirector } from '../roles/director.mjs';
import { buildGame, repairGame, polishGame } from '../roles/engineer.mjs';
import { runPlaytester } from '../roles/playtester.mjs';
import { runAuditor } from '../roles/auditor.mjs';
import { runSession } from '../verify/harness.mjs';
import { evaluateContract } from '../verify/contract.mjs';
import { assemble } from '../publish/assemble.mjs';
import { registerProduct, bumpStats } from '../memory/store.mjs';
import { costReport } from '../llm/client.mjs';

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function overBudget(budgetUsd) {
  const c = costReport();
  return c.costUsd > 0 && c.costUsd >= budgetUsd;
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

function summarizeFailure(bundle) {
  const lines = [
    `Attempt ${bundle.attempt} failed the technical contract.`,
    '',
    'Failed checks:',
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

  // Extract background color from design.js (Game constructor background: ...) or css
  let bgColor = '#101010';
  const bgMatch = design.js?.match(/background\s*:\s*['"`]([^'"`]+)['"`]/);
  if (bgMatch) bgColor = bgMatch[1];
  else {
    const cssBg = design.css?.match(/background\s*:\s*([^;}]+)/);
    if (cssBg) bgColor = cssBg[1].trim();
  }

  log.info(`verifying attempt ${attempt} (sha ${sha256(html).slice(0, 12)}) ...`);
  const report = await runSession({
    root: dir,
    seconds: LIMITS.playSeconds,
    screenshotDir: path.join(dir, 'shots')
  });
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

function failClosed(runDir, reason, extra = {}) {
  const payload = { reason, closedAt: new Date().toISOString(), cost: costReport(), ...extra };
  writeJson(path.join(runDir, 'FAILURE.json'), payload);
  bumpStats({ failed: 1 });
  log.error(`FAIL-CLOSED: ${reason}`);
  return { status: 'failed', reason, runDir };
}

function reviewMarkdown(meta) {
  return [
    `## Review needed: ${meta.title}`,
    '',
    `**Preview:** \`drafts/${meta.slug}/index.html\` (live on Pages after push)`,
    '',
    `> ${meta.tagline}`,
    '',
    '| Metric | Value |',
    `| Playtest overall | **${meta.overall} / 10** |`,
    `| Visuals / UI / Fun / Perf | ${meta.scores.visuals} / ${meta.scores.uiClarity} / ${meta.scores.funProxy} / ${meta.scores.performance} |`,
    `| Attempts (build+debug) | ${meta.attempts} |`,
    `| Polish rounds | ${meta.polishRounds} |`,
    `| Candidate SHA | \`${meta.candidateSha.slice(0, 16)}\` |`,
    '',
    '**Audit summary:** ' + meta.auditSummary,
    '',
    '**Top critique:**',
    ...(meta.critique.slice(0, 4).map((c) => '- ' + c)),
    '',
    '---',
    `Approve with comment \`/approve\` or reject with \`/reject <reason>\` on this issue.`,
    ``,
    `[slug:${meta.slug}]`
  ].join('\n');
}

export async function produceGame({ idea = '', source = 'chat', budgetUsd = LIMITS.budgetUsd }) {
  bumpStats({ runs: 1 });

  log.step('PHASE A - DIRECTING');
  const gdd = await runDirector({ idea, source });
  const slug = slugify(gdd.title);
  const runDir = path.join(PATHS.runs, `${stamp()}-${slug}`);
  ensureDir(runDir);
  writeJson(path.join(runDir, 'brief.json'), { idea, source, startedAt: new Date().toISOString(), budgetUsd });
  writeJson(path.join(runDir, 'gdd.json'), gdd);
  log.info(`concept: "${gdd.title}" (${gdd.genre}) -> run ${path.basename(runDir)}`);

  let design = null;
  let tech = null;
  const failureBundles = [];
  let attempt = 0;

  for (attempt = 1; attempt <= LIMITS.maxDebugRounds + 1; attempt++) {
    log.step(`PHASE B - BUILD & VERIFY (attempt ${attempt}/${LIMITS.maxDebugRounds + 1})`);
    try {
      design =
        attempt === 1
          ? await buildGame({ gdd, ownerIdea: idea })
          : await repairGame({ gdd, design, ownerIdea: idea, failureSummary: summarizeFailure(failureBundles[failureBundles.length - 1]) });
    } catch (e) {
      return failClosed(runDir, 'engineer_invalid_output', { error: String(e.message), attempt });
    }
    tech = await verifyAttempt({ runDir, attempt, design });
    if (tech.verdict.passed) break;
    failureBundles.push(failureBundle(tech.evidence));
    log.warn(`attempt ${attempt} failed contract (${tech.verdict.failures.length} checks)`);
    for (const f of tech.verdict.failures) {
      log.warn(`  FAILED CHECK [${f.id}] ${f.label} :: ${f.detail || 'no detail'}`);
    }
    if (overBudget(budgetUsd)) return failClosed(runDir, 'budget_exceeded_during_debug');
  }
  if (!tech?.verdict.passed) {
    return failClosed(runDir, 'debug_exhausted', { attempts: attempt, bundles: failureBundles });
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
      return failClosed(runDir, 'playtester_failed', { error: String(e.message) });
    }
    writeJson(path.join(runDir, `evidence-exp-${polishRounds}.json`), playtest);
    log.info(`overall score ${playtest.overall}/10 (gate ${LIMITS.minOverallScore})`);

    if (playtest.overall >= LIMITS.minOverallScore) break;
    if (polishRounds >= LIMITS.maxPolishRounds) break;
    if (overBudget(budgetUsd)) break;

    polishRounds++;
    log.step(`PHASE C - POLISH ROUND ${polishRounds}/${LIMITS.maxPolishRounds}`);
    const stableDesign = design;
    const stableTech = tech;
    try {
      design = await polishGame({ gdd, design, playtest, ownerIdea: idea, regressionNotes: polishRegressionNotes });
    } catch (e) {
      return failClosed(runDir, 'engineer_polish_invalid', { error: String(e.message) });
    }
    attempt++;
    tech = await verifyAttempt({ runDir, attempt, design });
    let repairs = 0;
    while (!tech.verdict.passed && repairs < 2) {
      repairs++;
      failureBundles.push(failureBundle(tech.evidence));
      design = await repairGame({
        gdd,
        design,
        ownerIdea: idea,
        failureSummary: summarizeFailure(failureBundles[failureBundles.length - 1])
      });
      attempt++;
      tech = await verifyAttempt({ runDir, attempt, design });
    }
    if (!tech.verdict.passed) {
      const regressionSummary = tech.verdict.failures
        .map((f) => `[${f.id}] ${f.detail || f.label}`)
        .join(' | ');
      polishRegressionNotes.push(`Round ${polishRounds}: ${regressionSummary}`);
      log.warn(`polish round ${polishRounds} regressed the technical contract after ${repairs} repair attempts; restoring last verified candidate and trying the next polish round`);
      design = stableDesign;
      tech = stableTech;
      continue;
    }
    log.info(`polish round ${polishRounds} preserved technical contract`);
  }

  if (!playtest || playtest.overall < LIMITS.minOverallScore) {
    return failClosed(runDir, 'experience_gate_not_met', {
      overall: playtest?.overall ?? null,
      required: LIMITS.minOverallScore,
      polishRounds,
      polishRegressions: polishRegressionNotes
    });
  }
  if (overBudget(budgetUsd)) {
    return failClosed(runDir, 'budget_exceeded_before_audit', { budgetUsd, cost: costReport() });
  }

  log.step('PHASE C - AUDIT');
  const cost = costReport();
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
    spentUsd: cost.costUsd,
    tokensUsed: cost.tokens
  };
  let audit;
  try {
    audit = await runAuditor({ digest });
  } catch (e) {
    return failClosed(runDir, 'auditor_failed', { error: String(e.message) });
  }
  writeJson(path.join(runDir, 'audit.json'), { digest, ...audit });
  log.info(`audit verdict: ${audit.verdict}`);
  if (audit.verdict !== 'PASS') {
    return failClosed(runDir, 'audit_rejected', { audit });
  }

  log.step('PHASE D - PUBLISH DRAFT');
  const draftDir = path.join(PATHS.drafts, slug);
  ensureDir(draftDir);
  fs.writeFileSync(path.join(draftDir, 'index.html'), tech.html);
  for (const shot of (tech.report._images || []).filter((s) => s.name !== 'shot-1-title')) {
    const b64 = shot.dataUrl.split(',')[1];
    fs.writeFileSync(path.join(draftDir, `${shot.name}.png`), Buffer.from(b64, 'base64'));
  }
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
    auditVerdict: audit.verdict,
    auditSummary: audit.summary ?? '',
    costUsd: cost.costUsd,
    tokens: cost.tokens
  };
  writeJson(path.join(draftDir, 'meta.json'), meta);
  writeText(path.join(draftDir, 'REVIEW.md'), reviewMarkdown(meta));
  registerProduct({ slug, title: gdd.title, genre: gdd.genre, date: meta.date, status: 'draft', score: playtest.overall });

  writeJson(path.join(runDir, 'RESULT.json'), { status: 'success', slug, meta });
  log.info(`draft ready: drafts/${slug}`);

  return { status: 'success', slug, runDir, meta };
}
