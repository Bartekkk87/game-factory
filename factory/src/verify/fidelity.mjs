import { ownerRequirementIds } from '../contract/owner.mjs';

const SUPPORTED_KINDS = new Set(['event', 'event_value_change', 'score_change', 'state_reached', 'event_absent', 'started_by_early', 'layout_no_overlap', 'restart_after_terminal']);
const GENERATED_EVENT_KINDS = new Set(['event', 'event_value_change', 'event_absent']);
const HARNESS_OBSERVED_KINDS = new Set(['score_change', 'state_reached', 'started_by_early', 'layout_no_overlap', 'restart_after_terminal']);

function allEvents(report) {
  const timeline = Array.isArray(report?.timeline) ? report.timeline : [];
  const events = [];
  const seen = new Set();
  for (const entry of timeline) {
    for (const event of entry?.snapshot?.events || []) {
      const key = `${entry?.scenarioId || 'base'}:${event?.seq ?? ''}:${event?.type ?? ''}:${event?.time ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(event);
    }
  }
  return events;
}

function scoreChanged(report) {
  const snapshots = (report?.timeline || []).map((entry) => entry?.snapshot).filter(Boolean);
  for (let i = 0; i < snapshots.length; i++) {
    for (let j = i + 1; j < snapshots.length; j++) {
      if (typeof snapshots[i].score === 'number' && typeof snapshots[j].score === 'number' && snapshots[j].score > snapshots[i].score) return true;
    }
  }
  return false;
}

function correlatedGameplayEvent(event, report) {
  const timeline = Array.isArray(report?.timeline) ? report.timeline : [];
  const start = timeline.find((entry) => entry?.phase === 'start')?.snapshot;
  const early = timeline.find((entry) => entry?.phase === 'early')?.snapshot;
  const eventTime = Number(event?.time);
  const earlyTime = Number(early?.time);
  const startScore = Number(start?.score);
  const eventScore = Number(event?.score);

  if (!event || event.state === 'title' || event.state === 'boot') {
    return { pass: false, detail: 'event occurred outside active gameplay state' };
  }
  if (!Number.isFinite(eventTime) || !Number.isFinite(earlyTime) || eventTime < earlyTime) {
    return { pass: false, detail: `event occurred too early for correlated gameplay evidence (event=${Number.isFinite(eventTime) ? eventTime : 'missing'}, early=${Number.isFinite(earlyTime) ? earlyTime : 'missing'})` };
  }
  if (!Number.isFinite(startScore) || !Number.isFinite(eventScore) || eventScore <= startScore) {
    return { pass: false, detail: `event lacks independent engine-observed gameplay value change (score ${Number.isFinite(startScore) ? startScore : 'missing'} -> ${Number.isFinite(eventScore) ? eventScore : 'missing'})` };
  }
  return { pass: true, detail: `event correlated with active gameplay at t=${eventTime}s and engine-observed score ${startScore} -> ${eventScore}` };
}

function normalizeProbe(probe) {
  const kind = probe?.kind;
  const eventType = String(probe?.eventType || probe?.legacyEventType || '');
  if ((kind === 'event' && eventType === 'hud_layout_clear') || (kind === 'event_absent' && eventType === 'hud_overlap_detected')) {
    return {
      ...probe,
      declaredKind: kind,
      legacyEventType: eventType,
      kind: 'layout_no_overlap',
      minRegions: Number.isFinite(Number(probe?.minRegions)) ? Math.max(1, Math.trunc(Number(probe.minRegions))) : 3,
      requireScoreProgress: probe?.requireScoreProgress !== false
    };
  }
  if ((kind === 'event' && eventType === 'fresh_run_started') || kind === 'restart_after_terminal') {
    return {
      ...probe,
      declaredKind: probe?.declaredKind || kind,
      legacyEventType: eventType || probe?.legacyEventType || null,
      kind: 'restart_after_terminal'
    };
  }
  return probe || {};
}

function evaluateLayoutNoOverlap(probe, report) {
  const timeline = Array.isArray(report?.timeline) ? report.timeline : [];
  const startScore = Number(timeline.find((entry) => entry?.phase === 'start')?.snapshot?.score);
  const minRegions = Number.isFinite(Number(probe?.minRegions)) ? Math.max(1, Math.min(12, Math.trunc(Number(probe.minRegions)))) : 3;
  const requireScoreProgress = probe?.requireScoreProgress !== false;
  let best = null;

  for (const entry of timeline) {
    const snapshot = entry?.snapshot;
    const layout = snapshot?.layout;
    if (!layout || layout.source !== 'playwright-canvas-draw-observation-v1') continue;
    if (!snapshot || snapshot.state === 'title' || snapshot.state === 'boot') continue;
    const regions = Array.isArray(layout.regions) ? layout.regions : [];
    const issues = Array.isArray(layout.issues) ? layout.issues : [];
    const score = Number(snapshot.score);
    const scoreProgress = !requireScoreProgress || (Number.isFinite(startScore) && Number.isFinite(score) && score > startScore);
    const candidate = {
      phase: entry?.phase ?? 'unknown',
      regions: regions.length,
      issues: issues.length,
      scoreProgress,
      issueTypes: [...new Set(issues.map((issue) => issue?.type || 'unknown'))]
    };
    if (!best || candidate.regions > best.regions || (candidate.regions === best.regions && candidate.issues < best.issues)) best = candidate;
    if (regions.length >= minRegions && issues.length === 0 && scoreProgress) {
      return {
        pass: true,
        detail: `independent canvas layout observed at ${candidate.phase}: ${regions.length} HUD regions, no overlap/out-of-bounds issues${requireScoreProgress ? ', with score progress' : ''}`
      };
    }
  }

  if (!best) return { pass: false, detail: 'no independent Playwright canvas layout observation available' };
  const issueDetail = best.issueTypes.length ? ` issues=${best.issueTypes.join(',')}` : '';
  return {
    pass: false,
    detail: `independent canvas layout insufficient at best phase ${best.phase}: regions=${best.regions}/${minRegions}, issueCount=${best.issues}, scoreProgress=${best.scoreProgress}${issueDetail}`
  };
}

function evaluateRestartAfterTerminal(report) {
  const scenarios = Array.isArray(report?.proofScenarios) ? report.proofScenarios : [];
  const terminal = scenarios.filter((scenario) => ['success-proof', 'failure-proof'].includes(scenario?.id));
  if (!terminal.length) return { pass: false, detail: 'no independent terminal proof scenarios available for restart verification' };

  const failures = [];
  for (const scenario of terminal) {
    const expectedState = scenario.id === 'success-proof' ? 'success' : 'failure';
    if (scenario.endState !== expectedState) {
      failures.push(`${scenario.id} did not reach ${expectedState} (end=${scenario.endState ?? 'missing'})`);
      continue;
    }
    if (scenario.postRestartState !== 'playing') {
      failures.push(`${scenario.id} did not return to playing after harness restart (post=${scenario.postRestartState ?? 'missing'})`);
    }
  }
  return failures.length
    ? { pass: false, detail: failures.join('; ') }
    : { pass: true, detail: `harness restarted ${terminal.map((s) => s.id).join(' and ')} into playing without page reload` };
}

function evaluateProbe(probe, report, events) {
  const effectiveProbe = normalizeProbe(probe);
  const kind = effectiveProbe?.kind;
  if (!SUPPORTED_KINDS.has(kind)) return { pass: false, detail: `unsupported evidence kind: ${kind ?? 'missing'}` };

  if (kind === 'layout_no_overlap') return evaluateLayoutNoOverlap(effectiveProbe, report);
  if (kind === 'restart_after_terminal') return evaluateRestartAfterTerminal(report);
  if (kind === 'event') {
    const candidates = events.filter((event) => event?.type === effectiveProbe.eventType);
    if (!candidates.length) return { pass: false, detail: `missing event ${effectiveProbe.eventType}` };
    if (effectiveProbe?.strength === 'correlated_gameplay') {
      const evaluated = candidates.map((event) => correlatedGameplayEvent(event, report));
      const passing = evaluated.find((result) => result.pass);
      return passing || { pass: false, detail: `${effectiveProbe.eventType} observed but not as correlated gameplay evidence: ${evaluated.map((result) => result.detail).join('; ')}` };
    }
    return { pass: true, detail: `event ${effectiveProbe.eventType} observed` };
  }
  if (kind === 'event_absent') {
    const found = events.find((event) => event?.type === effectiveProbe.eventType);
    return { pass: !found, detail: found ? `forbidden event ${effectiveProbe.eventType} observed` : `event ${effectiveProbe.eventType} absent` };
  }
  if (kind === 'event_value_change') {
    const found = events.find((event) => {
      if (event?.type !== effectiveProbe.eventType) return false;
      const beforeKey = effectiveProbe.beforeField || 'before';
      const afterKey = effectiveProbe.afterField || 'after';
      const before = event?.data?.[beforeKey];
      const after = event?.data?.[afterKey];
      return typeof before === 'number' && typeof after === 'number' && before !== after;
    });
    return { pass: !!found, detail: found ? `event ${effectiveProbe.eventType} changed gameplay value` : `no value-changing ${effectiveProbe.eventType} event` };
  }
  if (kind === 'score_change') {
    const pass = scoreChanged(report);
    return { pass, detail: pass ? 'score changed across telemetry' : 'score did not change across telemetry' };
  }
  if (kind === 'state_reached') {
    const wanted = String(effectiveProbe.state || '');
    const pass = (report?.timeline || []).some((entry) => entry?.snapshot?.state === wanted);
    return { pass, detail: pass ? `state ${wanted} reached in verifier scenarios` : `state ${wanted} not reached in verifier scenarios` };
  }
  if (kind === 'started_by_early') {
    const early = (report?.timeline || []).find((entry) => entry?.phase === 'early')?.snapshot;
    const pass = !!early && early.state !== 'title' && early.state !== 'boot';
    return { pass, detail: pass ? `early state=${early.state}` : `early state=${early?.state ?? 'missing'}` };
  }
  return { pass: false, detail: 'unreachable evidence kind' };
}

function evidenceSource(probe) {
  const effectiveProbe = normalizeProbe(probe);
  if (effectiveProbe?.kind === 'layout_no_overlap') return 'harness-observed-canvas-geometry';
  if (effectiveProbe?.kind === 'restart_after_terminal') return 'harness-observed-terminal-restart';
  if (HARNESS_OBSERVED_KINDS.has(effectiveProbe?.kind)) return 'harness-observed';
  if (effectiveProbe?.kind === 'event' && effectiveProbe?.strength === 'correlated_gameplay') return 'generated-game-event+runtime-correlation';
  if (GENERATED_EVENT_KINDS.has(effectiveProbe?.kind)) return 'generated-game-event-dependent';
  return 'unknown';
}

function coverageSummary(requirementIds, criteria) {
  const uniqueIds = (items) => [...new Set(items)].sort();
  const generatedGameEventDependentRequirementIds = uniqueIds(
    criteria.filter((criterion) => GENERATED_EVENT_KINDS.has(criterion.kind)).map((criterion) => criterion.requirementId)
  );
  const correlatedGeneratedGameEventRequirementIds = uniqueIds(
    criteria.filter((criterion) => criterion.kind === 'event' && criterion.strength === 'correlated_gameplay').map((criterion) => criterion.requirementId)
  );
  const harnessObservedRequirementIds = uniqueIds(
    criteria.filter((criterion) => HARNESS_OBSERVED_KINDS.has(criterion.kind)).map((criterion) => criterion.requirementId)
  );
  const canvasGeometryRequirementIds = uniqueIds(
    criteria.filter((criterion) => criterion.kind === 'layout_no_overlap').map((criterion) => criterion.requirementId)
  );
  return {
    evaluatedRequirementIds: [...requirementIds],
    harnessObservedRequirementIds,
    canvasGeometryRequirementIds,
    generatedGameEventDependentRequirementIds,
    correlatedGeneratedGameEventRequirementIds,
    unstructuredBriefContentEvaluated: false,
    scope: 'Product Fidelity evaluates only structured Owner Contract MH/NG requirements. layout_no_overlap and restart_after_terminal are independently observed by the Playwright harness. state_reached can be satisfied by separate deterministic product-proof scenarios. event/event_value_change/event_absent evidence depends on generated-game event instrumentation; correlated_gameplay additionally requires harness-observed gameplay timing, state and score change. Descriptive originalBrief content outside MH/NG is not evaluated here.'
  };
}

export function evaluateProductFidelity({ ownerContract, gdd, report } = {}) {
  const requirementIds = ownerRequirementIds(ownerContract);
  const probes = Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : [];
  const acceptance = Array.isArray(gdd?.acceptanceCriteria) ? gdd.acceptanceCriteria : [];
  const events = allEvents(report);
  const criteria = [];

  for (const requirementId of requirementIds) {
    const expectedAcceptanceId = `AC-${requirementId}`;
    const expectedProbeId = `PR-${requirementId}`;
    const ac = acceptance.find((item) => item?.ownerRequirementId === requirementId);
    const probe = probes.find((item) => item?.ownerRequirementId === requirementId);
    const effectiveProbe = normalizeProbe(probe);
    const traceable = ac?.id === expectedAcceptanceId && probe?.id === expectedProbeId && probe?.acceptanceId === expectedAcceptanceId;
    const observed = traceable ? evaluateProbe(effectiveProbe, report, events) : { pass: false, detail: 'missing or unstable acceptance/probe traceability' };
    criteria.push({
      requirementId,
      acceptanceId: expectedAcceptanceId,
      probeId: expectedProbeId,
      kind: effectiveProbe?.kind ?? null,
      declaredKind: probe?.declaredKind ?? probe?.kind ?? null,
      strength: effectiveProbe?.strength ?? null,
      eventType: probe?.eventType ?? probe?.legacyEventType ?? null,
      evidenceSource: evidenceSource(effectiveProbe),
      pass: !!(traceable && observed.pass),
      traceable,
      detail: observed.detail
    });
  }

  const failures = criteria.filter((criterion) => !criterion.pass);
  return {
    pass: requirementIds.length > 0 && failures.length === 0,
    status: failures.length ? 'failed' : requirementIds.length ? 'passed' : 'no-owner-requirements',
    contractSha256: ownerContract?.contractSha256 ?? null,
    requirementIds,
    criteria,
    failures,
    coverage: coverageSummary(requirementIds, criteria),
    observedEvents: events.slice(-128)
  };
}
