import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { compileProofPlan } from '../verify/proof-plan.mjs';
import { verifierActionContract } from '../verify/action-policy.mjs';
import { verifierStateContract } from '../verify/state-semantics.mjs';
import { LIMITS } from '../config.mjs';
import { assembleSystemPrompt } from '../util/skills.mjs';
import { lessonsFor, knownConcepts } from '../memory/store.mjs';

const DIRECTOR_MAX_ATTEMPTS = 3;

function validateDirectorGdd(rawGdd, ownerContract) {
  const missing = [];
  if (!rawGdd?.title) missing.push('title');
  if (!Array.isArray(rawGdd?.mechanics) || rawGdd.mechanics.length < 1) missing.push('mechanics');
  if (!Array.isArray(rawGdd?.artDirection?.palette) || rawGdd.artDirection.palette.length < 3) missing.push('artDirection.palette');
  if (!rawGdd?.probePlan?.scoreEvents?.length) missing.push('probePlan.scoreEvents');
  if (missing.length) throw new Error(`Director GDD incomplete, missing: ${missing.join(', ')}`);

  const compiled = compileDirectorTraceability(rawGdd, ownerContract);
  const proofPlan = compileProofPlan({
    gdd: compiled,
    baseSeconds: LIMITS.playSeconds,
    maxProofSeconds: LIMITS.maxProofSeconds
  });
  if (!proofPlan.pass) throw new Error(`Director proof plan unreachable: ${proofPlan.errors.join('; ')}`);
  return { ...compiled, proofPlan };
}

function basePayload({ idea, source, ownerContract }) {
  return {
    instruction: 'Create the Game Design Briefing JSON now. Preserve every Owner Contract requirement and map each one to exactly one observable acceptance criterion and verifier probe. Design all deterministic proof-critical gameplay so it is reachable under the supplied generic verifier action contract without verifier-specific routes or hidden hooks. Treat the supplied verifier state contract as a finite protocol: state_reached probes must use only its allowed values.',
    ownerIdea: idea || '(no specific idea - propose something original and highly playable)',
    ownerContract,
    verifierActionContract: verifierActionContract(),
    verifierStateContract: verifierStateContract(),
    ideaSource: source,
    alreadyBuiltConcepts_avoidDuplicates: knownConcepts()
  };
}

export async function runDirector({ idea, source, ownerContract }) {
  const system = assembleSystemPrompt({
    promptName: 'director',
    skillNames: ['directing', 'art-direction'],
    lessons: lessonsFor('director')
  });

  const base = basePayload({ idea, source, ownerContract });
  let repairContext = null;
  let lastValidationError = null;

  for (let attempt = 1; attempt <= DIRECTOR_MAX_ATTEMPTS; attempt++) {
    const user = JSON.stringify(
      repairContext
        ? {
            ...base,
            instruction: 'Repair the previous Game Design Briefing. Change only what is necessary to satisfy the deterministic schema, Owner traceability and proof-plan validation errors below. Preserve valid Owner requirements and do not weaken any verifier or acceptance criterion.',
            previousInvalidGdd: repairContext.previousInvalidGdd,
            deterministicValidationErrors: repairContext.errors
          }
        : base,
      null,
      2
    );

    const { text } = await chat({
      role: 'director',
      operation: attempt === 1 ? 'director' : 'director-repair',
      system,
      user,
      json: true,
      temperature: attempt === 1 ? 0.5 : 0.2
    });

    let rawGdd;
    try {
      rawGdd = extractJson(text);
      return validateDirectorGdd(rawGdd, ownerContract);
    } catch (error) {
      lastValidationError = error;
      if (attempt >= DIRECTOR_MAX_ATTEMPTS) break;
      repairContext = {
        previousInvalidGdd: rawGdd ?? String(text).slice(0, 12000),
        errors: [String(error?.message || error)]
      };
    }
  }

  throw lastValidationError || new Error('Director failed deterministic validation');
}
