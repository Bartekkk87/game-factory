import fs from 'node:fs/promises';
import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt } from '../util/skills.mjs';
import { ownerRequirementIds, ownerFidelityClaimIds, ownerIndependentReviewClaims } from '../contract/owner.mjs';

function compactGdd(gdd) {
  return {
    title: gdd?.title ?? null,
    tagline: gdd?.tagline ?? null,
    genre: gdd?.genre ?? null,
    mechanics: Array.isArray(gdd?.mechanics) ? gdd.mechanics : [],
    difficulty: gdd?.difficulty ?? null,
    juice: gdd?.juice ?? null,
    artDirection: gdd?.artDirection ?? null,
    acceptanceCriteria: Array.isArray(gdd?.acceptanceCriteria) ? gdd.acceptanceCriteria : [],
    probePlan: {
      scoreEvents: Array.isArray(gdd?.probePlan?.scoreEvents) ? gdd.probePlan.scoreEvents : [],
      requirementProbes: Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : []
    }
  };
}

function validateContext({ ownerContract, gdd, telemetry, runtimeEvents, deterministicProductFidelity }) {
  if (!ownerContract?.contractSha256 || ownerContract.immutable !== true) throw new Error('playtester requires immutable Owner Contract');
  const ids = ownerRequirementIds(ownerContract);
  if (!ids.length) throw new Error('playtester Owner Contract has no requirements');
  if (!Array.isArray(gdd?.acceptanceCriteria) || !Array.isArray(gdd?.probePlan?.requirementProbes)) throw new Error('playtester requires acceptance/probe mapping');
  if (!Array.isArray(telemetry) || !Array.isArray(runtimeEvents)) throw new Error('playtester requires telemetry and runtime events');
  if (typeof deterministicProductFidelity?.pass !== 'boolean') throw new Error('playtester requires deterministic Product Fidelity result');
}

export function validatePlaytesterResult(pt, ownerContract) {
  const knownIds = new Set(ownerFidelityClaimIds(ownerContract));
  const reviewIds = new Set(ownerIndependentReviewClaims(ownerContract).map((claim) => claim.id));
  if (!['PASS', 'FAIL'].includes(pt.fidelityVerdict)) throw new Error('playtester missing fidelityVerdict');
  pt.missingRequirements = Array.isArray(pt.missingRequirements) ? [...new Set(pt.missingRequirements.map(String))] : [];
  for (const id of pt.missingRequirements) {
    if (!knownIds.has(id)) throw new Error(`playtester referenced unknown Owner fidelity claim: ${id}`);
  }
  if (pt.fidelityVerdict === 'PASS' && pt.missingRequirements.length) throw new Error('playtester fidelity PASS cannot include missing requirements');
  if (pt.fidelityVerdict === 'FAIL' && !pt.missingRequirements.length) throw new Error('playtester fidelity FAIL must identify missing Owner fidelity claim IDs');
  pt.fidelityCritique = Array.isArray(pt.fidelityCritique) ? pt.fidelityCritique : [];
  pt.fullBriefCoverage = {
    independentReviewClaimIds: [...reviewIds],
    reviewed: reviewIds.size > 0,
    failedClaimIds: pt.missingRequirements.filter((id) => reviewIds.has(id)),
    pass: pt.missingRequirements.every((id) => !reviewIds.has(id))
  };

  const s = pt.scores ?? {};
  for (const k of ['visuals', 'uiClarity', 'funProxy', 'performance']) {
    if (typeof s[k] !== 'number') throw new Error(`playtester missing score: ${k}`);
  }
  if (typeof pt.overall !== 'number') pt.overall = Math.round(((s.visuals * 0.35 + s.uiClarity * 0.2 + s.funProxy * 0.35 + s.performance * 0.1) / 1) * 10) / 10;
  pt.critique = Array.isArray(pt.critique) ? pt.critique : [];
  pt.priorityFixes = Array.isArray(pt.priorityFixes) ? pt.priorityFixes.slice(0, 3) : [];
  return pt;
}

export function enforceIndependentFullBriefReview(pt, ownerContract) {
  const validated = validatePlaytesterResult(pt, ownerContract);
  if (!validated.fullBriefCoverage.pass) {
    const error = new Error(`independent full-brief fidelity failed for ${validated.fullBriefCoverage.failedClaimIds.join(', ')}`);
    error.code = 'FULL_BRIEF_FIDELITY_FAILED';
    error.failedClaimIds = validated.fullBriefCoverage.failedClaimIds;
    throw error;
  }
  return validated;
}

export async function runPlaytester({ metrics, images, ownerContract, gdd, telemetry, runtimeEvents, deterministicProductFidelity }) {
  validateContext({ ownerContract, gdd, telemetry, runtimeEvents, deterministicProductFidelity });
  const system = loadPrompt('playtester');
  const dataUrls = [];
  for (const img of images) {
    if (img?.dataUrl?.startsWith('data:image/')) dataUrls.push(img.dataUrl);
    else if (typeof img === 'string' && img.startsWith('data:image/')) dataUrls.push(img);
    else {
      const p = img.path ?? img;
      const buf = await fs.readFile(p);
      dataUrls.push(`data:image/png;base64,${buf.toString('base64')}`);
    }
  }

  const gddCompact = compactGdd(gdd);
  const independentReviewClaims = ownerIndependentReviewClaims(ownerContract);
  const user = [
    '=== IMMUTABLE OWNER CONTRACT ===', JSON.stringify(ownerContract, null, 2), '',
    '=== MANDATORY INDEPENDENT FULL-BRIEF CLAIMS ===', JSON.stringify(independentReviewClaims, null, 2), '',
    '=== COMPACT GAME DESIGN BRIEFING + ACCEPTANCE/PROBE MAPPING ===', JSON.stringify(gddCompact, null, 2), '',
    '=== DETERMINISTIC PRODUCT FIDELITY (MACHINE AUTHORITY FOR MH/NG; DO NOT OVERRIDE) ===', JSON.stringify(deterministicProductFidelity, null, 2), '',
    '=== OBJECTIVE SESSION METRICS ===', JSON.stringify(metrics, null, 2), '',
    '=== DETERMINISTIC TELEMETRY TIMELINE ===', JSON.stringify(telemetry, null, 2), '',
    '=== BOUNDED RUNTIME / MECHANIC EVENTS ===', JSON.stringify(runtimeEvents, null, 2), '',
    `Below: ${Math.min(dataUrls.length, 4)} screenshots captured during deterministic automated play, in chronological order. Review every mandatory independent full-brief claim against screenshots/evidence; do not self-certify from GDD prose.`
  ].join('\n');

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text } = await chat({ role: 'playtester', system, user, images: dataUrls.slice(0, 4), json: true, temperature: 0.3 });
      return enforceIndependentFullBriefReview(extractJson(text), ownerContract);
    } catch (e) {
      lastErr = e;
      if (e?.code === 'FULL_BRIEF_FIDELITY_FAILED') throw e;
    }
  }
  throw lastErr;
}
