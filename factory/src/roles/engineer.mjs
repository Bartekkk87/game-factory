import fs from 'node:fs';
import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt, loadSkill } from '../util/skills.mjs';
import { lessonsFor } from '../memory/store.mjs';
import { PATHS } from '../config.mjs';

function systemPrompt() {
  return (
    loadPrompt('engineer') +
    loadSkill('engineering') +
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
  if (/\b(?:game|this\.game)\.hitStop\s*=(?!=)/.test(design.js)) {
    problems.push('hitStop is a method and must not be overwritten');
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
    'Implement this game now (fresh build). Output ONLY strict JSON with slots title/css/html/js.',
    '',
    '=== ESSENTIAL RULES (critical - violate and output is REJECTED) ===',
    '- Output must be valid JSON with exactly: title, css, html, js.',
    '- js MUST contain new GF.Game({...}) constructor call.',
    '- NO external URLs in js/css/html.',
    '- game.hitStop() must be called as a METHOD (game.hitStop(0.1)), NOT assigned as property.',
    '- Keep JavaScript MULTILINE and reasonably readable.',
    '- Score must increase within 4 seconds of simulated gameplay.',
    '- Game must be playable: draw background + player + enemies each frame.',
    '',
    '=== GAME DESIGN BRIEFING ===',
    JSON.stringify(gdd, null, 2),
    '',
    '=== MICRO-ENGINE SOURCE (injected automatically before your js - do NOT repeat it) ===',
    engineSource()
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.3, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}

export async function repairGame({ gdd, design, failureSummary }) {
  const user = [
    '=== TASK ===',
    'REPAIR MODE: previous attempt failed verification. Fix exactly the listed failures.',
    'IMPORTANT: do NOT return previous code unchanged or near-unchanged.',
    'You MUST actually modify js/css/html so output passes verification.',
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

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.3, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}

export async function polishGame({ gdd, design, playtest }) {
  const user = [
    '=== TASK ===',
    'POLISH MODE: game works but visual review demands improvements.',
    'Apply priorityFixes and address critique while keeping all mechanics working.',
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

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.3, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}