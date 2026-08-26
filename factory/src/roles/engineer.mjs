import fs from 'node:fs';
import { chat, costReport } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt, loadSkill } from '../util/skills.mjs';
import { lessonsFor } from '../memory/store.mjs';
import { PATHS } from '../config.mjs';

function systemPrompt() {
  return (
    loadPrompt('engineer') +
    loadSkill('engineering') +
    loadSkill('art-direction') +
    (lessonsFor('engineer').length
      ? `\n\n## Lessons from past post-mortems\n${lessonsFor('engineer').join('\n')}`
      : '')
  );
}

function engineSource() {
  return fs.readFileSync(PATHS.engineFile, 'utf8');
}

function validateDesign(design) {
  const problems = [];
  if (typeof design.js !== 'string' || design.js.trim().length < 200) problems.push('js slot too short/missing');
  if (!design.js.includes('new GF.Game')) problems.push('js must instantiate GF.Game');
  if (/<\/script/i.test(design.js)) problems.push('js contains literal closing script tag');
  if (/https?:\/\//i.test(design.js) || /https?:\/\//i.test(design.css || '') || /https?:\/\//i.test(design.html || '')) {
    problems.push('external URLs are forbidden');
  }
  if (!design.title) design.title = 'Untitled';
  for (const key of ['css', 'html']) {
    if (typeof design[key] !== 'string') design[key] = '';
    design[key] = design[key].replace(/<\/script/gi, '<\\/script');
  }
  design.js = design.js.replace(/<\/script/gi, '<\\/script');
  if (problems.length) throw new Error(`Engineer output invalid: ${problems.join('; ')}`);
  return design;
}

export async function buildGame({ gdd }) {
  const user = [
    '=== TASK ===',
    'Implement this game now (fresh build). Output ONLY the strict JSON with slots title/css/html/js.',
    '',
    '=== GAME DESIGN BRIEFING ===',
    JSON.stringify(gdd, null, 2),
    '',
    '=== MICRO-ENGINE SOURCE (injected automatically before your js - do NOT repeat it) ===',
    engineSource()
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.8, maxTokens: 32000 });
  return validateDesign(extractJson(text));
}

export async function repairGame({ gdd, design, failureSummary }) {
  const user = [
    '=== TASK ===',
    'REPAIR MODE: The previous attempt failed automated verification.',
    'Fix exactly the listed failures while preserving everything that worked.',
    'IMPORTANT: Do NOT return the previous code unchanged or near-unchanged.',
    'You must actually modify js/css/html so that every listed check passes.',
    'If a check measures score increase via simulated input, make sure the game',
    'auto-plays/responds to keyboard+mouse events and the __GF__ probe reports state=playing and a rising score.',
    'Return the FULL corrected JSON (title/css/html/js).',
    '',
    '=== FAILURE EVIDENCE ===',
    failureSummary,
    '',
    '=== GAME DESIGN BRIEFING ===',
    JSON.stringify(gdd, null, 2),
    '',
    '=== PREVIOUS ATTEMPT (json with title/css/html/js) ===',
    JSON.stringify(design, null, 2),
    '',
    '=== MICRO-ENGINE SOURCE ===',
    engineSource()
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.4, maxTokens: 32000 });
  return validateDesign(extractJson(text));
}

export async function polishGame({ gdd, design, playtest }) {
  const user = [
    '=== TASK ===',
    'POLISH MODE: The game works technically but the visual/experience review demands improvements.',
    'Apply the priorityFixes and address the critique while keeping all mechanics working.',
    'Return the FULL corrected JSON (title/css/html/js).',
    '',
    '=== PLAYTEST REVIEW ===',
    JSON.stringify(playtest, null, 2),
    '',
    '=== GAME DESIGN BRIEFING ===',
    JSON.stringify(gdd, null, 2),
    '',
    '=== CURRENT IMPLEMENTATION (json with title/css/html/js) ===',
    JSON.stringify(design, null, 2),
    '',
    '=== MICRO-ENGINE SOURCE ===',
    engineSource()
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.6, maxTokens: 32000 });
  return validateDesign(extractJson(text));
}
