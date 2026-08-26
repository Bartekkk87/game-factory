import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt, loadSkill } from '../util/skills.mjs';
import { lessonsFor, knownConcepts } from '../memory/store.mjs';

export async function runDirector({ idea, source }) {
  const system =
    loadPrompt('director') +
    loadSkill('directing') +
    (lessonsFor('director').length
      ? `\n\n## Lessons from past post-mortems\n${lessonsFor('director').join('\n')}`
      : '');

  const user = JSON.stringify(
    {
      instruction: 'Create the Game Design Briefing JSON now.',
      ownerIdea: idea || '(no specific idea - propose something original and highly playable)',
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
  const gdd = extractJson(text);

  const missing = [];
  if (!gdd.title) missing.push('title');
  if (!Array.isArray(gdd.mechanics) || gdd.mechanics.length < 1) missing.push('mechanics');
  if (!Array.isArray(gdd.artDirection?.palette) || gdd.artDirection.palette.length < 3) missing.push('artDirection.palette');
  if (!gdd.probePlan?.scoreEvents?.length) missing.push('probePlan.scoreEvents');
  if (missing.length) throw new Error(`Director GDD incomplete, missing: ${missing.join(', ')}`);

  return gdd;
}
