import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { compileDirectorTraceability } from '../contract/traceability.mjs';
import { compileProofPlan } from '../verify/proof-plan.mjs';
import { verifierActionContract } from '../verify/action-policy.mjs';
import { LIMITS } from '../config.mjs';
import { assembleSystemPrompt } from '../util/skills.mjs';
import { lessonsFor, knownConcepts } from '../memory/store.mjs';

export async function runDirector({ idea, source, ownerContract }) {
  const system = assembleSystemPrompt({
    promptName: 'director',
    skillNames: ['directing', 'art-direction'],
    lessons: lessonsFor('director')
  });

  const user = JSON.stringify(
    {
      instruction: 'Create the Game Design Briefing JSON now. Preserve every Owner Contract requirement and map each one to exactly one observable acceptance criterion and verifier probe. Design all deterministic proof-critical gameplay so it is reachable under the supplied generic verifier action contract without verifier-specific routes or hidden hooks.',
      ownerIdea: idea || '(no specific idea - propose something original and highly playable)',
      ownerContract,
      verifierActionContract: verifierActionContract(),
      ideaSource: source,
      alreadyBuiltConcepts_avoidDuplicates: knownConcepts()
    },
    null,
    2
  );

  const { text } = await chat({
    role: 'director',
    system,
    user,
    json: true,
    temperature: 0.9
  });
  const rawGdd = extractJson(text);

  const missing = [];
  if (!rawGdd.title) missing.push('title');
  if (!Array.isArray(rawGdd.mechanics) || rawGdd.mechanics.length < 1) missing.push('mechanics');
  if (!Array.isArray(rawGdd.artDirection?.palette) || rawGdd.artDirection.palette.length < 3) missing.push('artDirection.palette');
  if (!rawGdd.probePlan?.scoreEvents?.length) missing.push('probePlan.scoreEvents');
  if (missing.length) throw new Error(`Director GDD incomplete, missing: ${missing.join(', ')}`);

  const compiled = compileDirectorTraceability(rawGdd, ownerContract);
  const proofPlan = compileProofPlan({
    gdd: compiled,
    baseSeconds: LIMITS.playSeconds,
    maxProofSeconds: LIMITS.maxProofSeconds
  });
  if (!proofPlan.pass) {
    throw new Error(`Director proof plan unreachable: ${proofPlan.errors.join('; ')}`);
  }

  return { ...compiled, proofPlan };
}
