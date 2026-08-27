import { ownerRequirementIds } from '../contract/owner.mjs';

const SUPPORTED_KINDS = new Set(['event', 'event_value_change', 'score_change', 'state_reached', 'event_absent', 'started_by_early']);

function allEvents(report) {
  const timeline = Array.isArray(report?.timeline) ? report.timeline : [];
  const events = [];
  const seen = new Set();
  for (const entry of timeline) {
    for (const event of entry?.snapshot?.events || []) {
      const key = `${event?.seq ?? ''}:${event?.type ?? ''}:${event?.time ?? ''}`;
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

function evaluateProbe(probe, report, events) {
  const kind = probe?.kind;
  if (!SUPPORTED_KINDS.has(kind)) return { pass: false, detail: `unsupported evidence kind: ${kind ?? 'missing'}` };

  if (kind === 'event') {
    const found = events.find((event) => event?.type === probe.eventType);
    return { pass: !!found, detail: found ? `event ${probe.eventType} observed` : `missing event ${probe.eventType}` };
  }
  if (kind === 'event_absent') {
    const found = events.find((event) => event?.type === probe.eventType);
    return { pass: !found, detail: found ? `forbidden event ${probe.eventType} observed` : `event ${probe.eventType} absent` };
  }
  if (kind === 'event_value_change') {
    const found = events.find((event) => {
      if (event?.type !== probe.eventType) return false;
      const beforeKey = probe.beforeField || 'before';
      const afterKey = probe.afterField || 'after';
      const before = event?.data?.[beforeKey];
      const after = event?.data?.[afterKey];
      return typeof before === 'number' && typeof after === 'number' && before !== after;
    });
    return { pass: !!found, detail: found ? `event ${probe.eventType} changed gameplay value` : `no value-changing ${probe.eventType} event` };
  }
  if (kind === 'score_change') {
    const pass = scoreChanged(report);
    return { pass, detail: pass ? 'score changed across telemetry' : 'score did not change across telemetry' };
  }
  if (kind === 'state_reached') {
    const wanted = String(probe.state || '');
    const pass = (report?.timeline || []).some((entry) => entry?.snapshot?.state === wanted);
    return { pass, detail: pass ? `state ${wanted} reached` : `state ${wanted} not reached` };
  }
  if (kind === 'started_by_early') {
    const early = (report?.timeline || []).find((entry) => entry?.phase === 'early')?.snapshot;
    const pass = !!early && early.state !== 'title' && early.state !== 'boot';
    return { pass, detail: pass ? `early state=${early.state}` : `early state=${early?.state ?? 'missing'}` };
  }
  return { pass: false, detail: 'unreachable evidence kind' };
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
    const traceable = ac?.id === expectedAcceptanceId && probe?.id === expectedProbeId && probe?.acceptanceId === expectedAcceptanceId;
    const observed = traceable ? evaluateProbe(probe, report, events) : { pass: false, detail: 'missing or unstable acceptance/probe traceability' };
    criteria.push({
      requirementId,
      acceptanceId: expectedAcceptanceId,
      probeId: expectedProbeId,
      kind: probe?.kind ?? null,
      eventType: probe?.eventType ?? null,
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
    observedEvents: events.slice(-128)
  };
}
