import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../config.mjs';
import { readJson } from '../util/fsx.mjs';
import { canonicalTerminalState, canonicalVerifierState } from '../verify/state-semantics.mjs';

export const ROOT_CAUSE_SCHEMA = 'failed-run-root-cause-v1';

function listAttemptDirs(runDir) {
  if (!fs.existsSync(runDir)) return [];
  return fs.readdirSync(runDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^attempt-\d+$/.test(entry.name))
    .map((entry) => path.join(runDir, entry.name))
    .sort((a, b) => Number(path.basename(a).split('-')[1]) - Number(path.basename(b).split('-')[1]));
}

function failedItems(evidence, kind) {
  if (!evidence || typeof evidence !== 'object') return [];
  const source = kind === 'technical'
    ? (evidence.contract?.checks || evidence.checks || [])
    : (evidence.criteria || evidence.contract?.criteria || []);
  return source.filter((item) => item?.pass === false || item?.passed === false);
}

function collectRuntimeErrors(value, out = new Set(), seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectRuntimeErrors(item, out, seen);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if ((lower === 'pageerrors' || lower === 'consoleerrors' || lower === 'runtimeerrors' || lower === 'errors') && Array.isArray(child)) {
      for (const item of child) {
        const text = typeof item === 'string' ? item : item?.message || item?.text || item?.error || '';
        if (String(text).trim()) out.add(String(text).trim());
      }
    }
    collectRuntimeErrors(child, out, seen);
  }
  return out;
}

function collectObservedStates(value, out = new Set(), seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectObservedStates(item, out, seen);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    if (['state', 'endState', 'postRestartState'].includes(key) && typeof child === 'string' && child.trim()) out.add(child.trim().toLowerCase());
    collectObservedStates(child, out, seen);
  }
  return out;
}

function collectStateProbes(value, out = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectStateProbes(item, out, seen);
    return out;
  }
  if (String(value.kind || '') === 'state_reached' && typeof value.state === 'string') {
    out.push({ id: value.id || value.probeId || null, state: value.state, canonical: canonicalVerifierState(value.state) });
  }
  for (const child of Object.values(value)) collectStateProbes(child, out, seen);
  return out;
}

function collectProofScenarios(value, out = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectProofScenarios(item, out, seen);
    return out;
  }
  if (typeof value.id === 'string' && Array.isArray(value.stopStates) && typeof value.inputMode === 'string') {
    out.push({
      id: value.id,
      inputMode: value.inputMode,
      seconds: Number(value.seconds) || null,
      stopStates: value.stopStates.map(String),
      canonicalStopStates: value.stopStates.map(canonicalTerminalState).filter(Boolean),
      restartAtEnd: value.restartAtEnd === true
    });
  }
  for (const child of Object.values(value)) collectProofScenarios(child, out, seen);
  return out;
}

function attemptSummary(attemptDir) {
  const id = path.basename(attemptDir);
  const tech = readJson(path.join(attemptDir, 'evidence-tech.json'), null);
  const fidelity = readJson(path.join(attemptDir, 'evidence-fidelity.json'), null);
  const telemetry = readJson(path.join(attemptDir, 'telemetry.json'), null);
  const technicalFailures = failedItems(tech, 'technical');
  const fidelityFailures = failedItems(fidelity, 'product-fidelity');
  const runtimeErrors = [...collectRuntimeErrors({ tech, telemetry })].sort();
  const observedStates = [...collectObservedStates({ tech, telemetry })].sort();
  return {
    id,
    failedChecks: technicalFailures.length + fidelityFailures.length,
    technicalFailures: technicalFailures.map((x) => x.id || x.checkId || x.label || 'unknown'),
    fidelityFailures: fidelityFailures.map((x) => x.requirementId || x.probeId || x.id || 'unknown'),
    failedCriteria: fidelityFailures.map((x) => ({
      requirementId: x.requirementId || null,
      probeId: x.probeId || null,
      kind: x.kind || x.declaredKind || null,
      detail: x.detail || null
    })),
    runtimeErrors,
    observedStates,
    evidenceRefs: [
      fs.existsSync(path.join(attemptDir, 'evidence-tech.json')) ? `${id}/evidence-tech.json` : null,
      fs.existsSync(path.join(attemptDir, 'evidence-fidelity.json')) ? `${id}/evidence-fidelity.json` : null,
      fs.existsSync(path.join(attemptDir, 'telemetry.json')) ? `${id}/telemetry.json` : null
    ].filter(Boolean)
  };
}

function finding(id, confidence, targetLayer, role, summary, evidence, validationPlan) {
  return { id, confidence, targetLayer, role, summary, evidence: [...new Set(evidence)].sort(), validationPlan };
}

export function analyzeFailedProductionRun({ runId, runsRoot = PATHS.runs } = {}) {
  const id = String(runId || '').trim();
  if (!id) throw new Error('root cause analysis requires runId');
  const runDir = path.join(runsRoot, id);
  const runEvidence = readJson(path.join(runDir, 'RUN-EVIDENCE.json'), null);
  if (!runEvidence?.run?.id) throw new Error(`run evidence not found: ${id}`);
  if (String(runEvidence.run.status || '').toLowerCase() !== 'failed') throw new Error(`root cause analysis only accepts failed production runs: ${id}`);

  const gdd = readJson(path.join(runDir, 'gdd.json'), null);
  const attempts = listAttemptDirs(runDir).map(attemptSummary);
  const best = attempts.length ? [...attempts].sort((a, b) => a.failedChecks - b.failedChecks || Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]))[0] : null;
  const final = attempts.at(-1) || null;
  const stateProbes = collectStateProbes(gdd);
  const proofScenarios = collectProofScenarios(gdd);
  const findings = [];

  if (best && final && final.id !== best.id && final.failedChecks > best.failedChecks) {
    findings.push(finding(
      'repair-regression-after-best-attempt', 1, 'control-plane', 'engineer',
      `Repair trajectory regressed after ${best.id}: best=${best.failedChecks} failed checks, final=${final.failedChecks}.`,
      [best.id, final.id],
      'Reproduce the attempt trajectory and prove a best-so-far repair-base policy retains the lowest-failure candidate across later regressions.'
    ));
  }

  if (best && final) {
    const introduced = final.runtimeErrors.filter((error) => !best.runtimeErrors.includes(error));
    if (introduced.length) {
      findings.push(finding(
        'new-runtime-error-after-repair', 1, 'control-plane', 'engineer',
        `A later repair introduced ${introduced.length} runtime error(s) absent from the best prior attempt.`,
        [best.id, final.id, ...introduced],
        'Use a deterministic repair fixture where a lower-failure candidate is followed by a candidate with a new runtime error; the latter must not replace the repair base.'
      ));
    }
  }

  const terminalProbes = stateProbes.filter((probe) => canonicalTerminalState(probe.state));
  for (const probe of terminalProbes) {
    const terminal = canonicalTerminalState(probe.state);
    const matchingScenario = proofScenarios.find((scenario) => scenario.canonicalStopStates.includes(terminal));
    if (!matchingScenario) {
      findings.push(finding(
        'terminal-proof-scenario-gap', 1, 'verifier', 'director',
        `Terminal probe ${probe.id || '(unnamed)'} requests raw state ${probe.state} (${terminal}) but no proof scenario stops on canonical ${terminal}.`,
        ['gdd.json', probe.id || probe.state],
        'Compile the proof plan with known terminal aliases and fail closed before Engineer spend when any terminal probe lacks an independent reachable scenario.'
      ));
    }
  }

  const observedStates = [...new Set(attempts.flatMap((attempt) => attempt.observedStates))].sort();
  for (const probe of terminalProbes) {
    const desired = canonicalTerminalState(probe.state);
    const observedAlias = observedStates.find((state) => canonicalTerminalState(state) === desired && state !== String(probe.state).toLowerCase());
    const failedSomewhere = attempts.some((attempt) => attempt.failedCriteria.some((criterion) => criterion.probeId === probe.id || criterion.detail?.includes(`state ${probe.state}`)));
    if (observedAlias && failedSomewhere) {
      findings.push(finding(
        'terminal-state-vocabulary-mismatch', 0.95, 'verifier', 'director',
        `Verifier evidence observed runtime state ${observedAlias}, semantically equivalent to requested ${probe.state}, while the related terminal proof still failed in at least one attempt.`,
        ['gdd.json', observedAlias, probe.id || probe.state],
        'Normalize only proven verifier/runtime state aliases at one verifier-owned boundary, preserve raw states as evidence, and keep unknown states fail closed.'
      ));
    }
  }

  if (best) {
    const terminalFailures = best.failedCriteria.filter((criterion) => criterion.kind === 'state_reached' || criterion.kind === 'restart_after_terminal');
    for (const criterion of terminalFailures) {
      const detail = String(criterion.detail || '').toLowerCase();
      const target = detail.includes('success') ? 'success' : detail.includes('failure') || detail.includes('failed') ? 'failure' : null;
      const scenario = target ? proofScenarios.find((item) => item.canonicalStopStates.includes(target)) : null;
      if (target && scenario && !best.observedStates.some((state) => canonicalTerminalState(state) === target)) {
        findings.push(finding(
          'terminal-action-reachability-unresolved', 0.7, 'verifier', 'director',
          `${best.id} had a planned ${target} scenario (${scenario.id}) but no observed runtime state canonicalized to ${target}; the generic action policy may be insufficient or the game path may be unreachable.`,
          [best.id, 'gdd.json', scenario.id],
          'Create a deterministic browser fixture that requires a non-trivial action sequence. Prove whether the harness action policy can reach the target without self-attestation; if not, repair action reachability without weakening Product Fidelity.'
        ));
      }
    }
  }

  const deduped = [...new Map(findings.map((item) => [item.id, item])).values()]
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));
  const primary = deduped[0] || null;
  const sourceRefs = [
    'RUN-EVIDENCE.json',
    fs.existsSync(path.join(runDir, 'FAILURE.json')) ? 'FAILURE.json' : null,
    gdd ? 'gdd.json' : null,
    ...attempts.flatMap((attempt) => attempt.evidenceRefs)
  ].filter(Boolean);

  return {
    schemaVersion: ROOT_CAUSE_SCHEMA,
    runId: id,
    runStatus: runEvidence.run.status,
    runReason: runEvidence.run.reason || null,
    generatedFrom: 'durable-run-evidence-only',
    authority: {
      may: ['diagnose-evidence', 'rank-hypotheses', 'propose-validation'],
      mustNot: ['edit-production', 'validate-candidate', 'activate-candidate', 'weaken-gates', 'start-paid-run']
    },
    attempts,
    trajectory: attempts.map((attempt) => attempt.failedChecks),
    bestAttempt: best?.id || null,
    finalAttempt: final?.id || null,
    stateProbes,
    proofScenarios,
    observedStates,
    findings: deduped,
    primaryFindingId: primary?.id || null,
    sourceRefs: [...new Set(sourceRefs)].sort(),
    conclusion: primary
      ? `Primary evidence-backed hypothesis: ${primary.summary}`
      : 'No bounded root-cause hypothesis crossed the deterministic evidence threshold; preserve evidence and require further validation before repair.'
  };
}

export function proposalFromRootCause(report, candidateId) {
  const primary = report?.findings?.[0];
  if (!primary) return null;
  const alternatives = report.findings.slice(1, 4).map((item) => item.id);
  return {
    id: candidateId,
    role: primary.role,
    scope: 'case-root-cause',
    targetLayer: primary.targetLayer,
    text: `Hypothesis only from autonomous failed-run diagnosis ${report.runId}: ${primary.summary} Validation required: ${primary.validationPlan}${alternatives.length ? ` Alternative evidence-backed findings retained in the root-cause dossier: ${alternatives.join(', ')}.` : ''} Do not activate, promote, weaken gates, or start a paid retry from this candidate alone.`,
    sourceRunIds: [report.runId],
    sourceKind: 'autonomous-failed-run-root-cause',
    ownerFeedbackIds: [],
    confidence: primary.confidence,
    evidenceCount: report.sourceRefs.length
  };
}
