import { ownerRequirementIds } from './owner.mjs';

export const FIDELITY_EVIDENCE_KINDS = Object.freeze([
  'event',
  'event_value_change',
  'score_change',
  'state_reached',
  'event_absent',
  'started_by_early'
]);

const EVIDENCE_KIND_SET = new Set(FIDELITY_EVIDENCE_KINDS);

function requireString(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Director traceability missing ${field}`);
  return text;
}

function exactlyOne(items, requirementId, label) {
  const matches = items.filter((item) => item?.ownerRequirementId === requirementId);
  if (matches.length !== 1) {
    throw new Error(`Director traceability requires exactly one ${label} for ${requirementId}; found ${matches.length}`);
  }
  return matches[0];
}

export function compileDirectorTraceability(gdd, ownerContract) {
  const requirementIds = ownerRequirementIds(ownerContract);
  if (!requirementIds.length) throw new Error('Owner Contract has no requirements');

  const acceptance = Array.isArray(gdd?.acceptanceCriteria) ? gdd.acceptanceCriteria : [];
  const probes = Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : [];
  const known = new Set(requirementIds);

  for (const item of acceptance) {
    if (!known.has(item?.ownerRequirementId)) {
      throw new Error(`Director acceptance criterion references unknown Owner requirement ${item?.ownerRequirementId ?? 'missing'}`);
    }
  }
  for (const item of probes) {
    if (!known.has(item?.ownerRequirementId)) {
      throw new Error(`Director probe references unknown Owner requirement ${item?.ownerRequirementId ?? 'missing'}`);
    }
  }

  const compiledAcceptance = [];
  const compiledProbes = [];
  for (const requirementId of requirementIds) {
    const ac = exactlyOne(acceptance, requirementId, 'acceptance criterion');
    const probe = exactlyOne(probes, requirementId, 'probe');
    const acceptanceId = `AC-${requirementId}`;
    const probeId = `PR-${requirementId}`;
    const kind = requireString(probe.kind, `${probeId}.kind`);
    if (!EVIDENCE_KIND_SET.has(kind)) {
      throw new Error(`Director probe ${probeId} uses unsupported evidence kind ${kind}`);
    }

    const compiledProbe = {
      ...probe,
      id: probeId,
      acceptanceId,
      ownerRequirementId: requirementId,
      kind
    };
    if (kind === 'event' || kind === 'event_absent' || kind === 'event_value_change') {
      compiledProbe.eventType = requireString(probe.eventType, `${probeId}.eventType`);
    }
    if (kind === 'event_value_change') {
      compiledProbe.beforeField = String(probe.beforeField || 'before');
      compiledProbe.afterField = String(probe.afterField || 'after');
    }
    if (kind === 'state_reached') {
      compiledProbe.state = requireString(probe.state, `${probeId}.state`);
    }

    compiledAcceptance.push({
      ...ac,
      id: acceptanceId,
      ownerRequirementId: requirementId,
      statement: requireString(ac.statement, `${acceptanceId}.statement`)
    });
    compiledProbes.push(compiledProbe);
  }

  return {
    ...gdd,
    acceptanceCriteria: compiledAcceptance,
    probePlan: {
      ...(gdd?.probePlan || {}),
      requirementProbes: compiledProbes
    }
  };
}
