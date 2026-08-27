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

function acceptanceRules() {
  return [
    '=== NON-NEGOTIABLE PRODUCT + VERIFICATION CONTRACT ===',
    '- The ORIGINAL OWNER IDEA is a hard product contract. Explicit Must-Haves/Muss-Haves and No-Gos override simplifications in the GDD.',
    '- Implement every explicit Must-Have and every GDD mechanic as a visible, playable behavior; do not replace requested mechanics with decorative stand-ins.',
    '- If the brief asks for a boss/Titan, it must be visually distinct and mechanically meaningful, not just a normal enemy rectangle.',
    '- If the brief asks for salvage/upgrades, collecting/choosing an upgrade must change a real gameplay value or ability and show clear feedback.',
    '- If the brief asks for a risk/reward choice, implement an actual player choice with distinct outcomes.',
    '- Preserve readable HUD layout with no overlapping labels.',
    '- Score must increase deterministically within 4 seconds of ordinary simulated keyboard/mouse gameplay. Never make this depend on a lucky random collision, rare spawn, or precise aim.',
    '- The game must remain playable under WASD/arrows/Space/Enter and pointer clicks as applicable.',
    '- Use ONLY APIs and properties that actually exist in the supplied MICRO-ENGINE SOURCE. Do not invent engine methods or state containers.',
    '- Prefer simple scene-owned arrays/state over unnecessary abstractions. game.currentScene is a safe getter for the active registered scene after play has started.',
    '- No external URLs or assets. Keep runtime free of console/page/probe errors and maintain >=30 FPS.',
    '- Keep JavaScript multiline and reasonably readable.'
  ].join('\n');
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

export async function buildGame({ gdd, ownerIdea = '' }) {
  const user = [
    '=== TASK ===',
    'Implement this game now (fresh build). Output ONLY strict JSON with slots title/css/html/js.',
    '',
    acceptanceRules(),
    '',
    '=== ORIGINAL OWNER IDEA ===',
    ownerIdea || '(no additional owner brief)',
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

export async function rebuildGame({ gdd, ownerIdea = '', failureHistory = [] }) {
  const user = [
    '=== TASK ===',
    'ESCALATION MODE: targeted repairs have stalled. DISCARD the previous implementation architecture and build a genuinely fresh implementation from scratch.',
    'Do not copy the prior code structure. Solve the owner brief with the simplest robust state model that can pass verification.',
    'Output ONLY strict JSON with slots title/css/html/js.',
    '',
    acceptanceRules(),
    '',
    '=== FAILURES THE NEW ARCHITECTURE MUST AVOID ===',
    ...(failureHistory.length ? failureHistory.map((f) => `- ${f}`) : ['- Previous repair attempts made no progress.']),
    '',
    '=== ORIGINAL OWNER IDEA ===',
    ownerIdea || '(no additional owner brief)',
    '',
    '=== GAME DESIGN BRIEFING ===',
    JSON.stringify(gdd, null, 2),
    '',
    '=== MICRO-ENGINE SOURCE ===',
    engineSource()
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.6, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}

export async function repairGame({ gdd, design, failureSummary, ownerIdea = '' }) {
  const user = [
    '=== TASK ===',
    'REPAIR MODE: previous attempt failed verification. Fix exactly the listed failures while preserving every behavior that already works.',
    'IMPORTANT: do NOT return previous code unchanged or near-unchanged.',
    'You MUST actually modify js/css/html so output passes verification.',
    '',
    acceptanceRules(),
    '',
    '=== FAILURE EVIDENCE ===',
    failureSummary,
    '',
    '=== ORIGINAL OWNER IDEA ===',
    ownerIdea || '(no additional owner brief)',
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

export async function polishGame({ gdd, design, playtest, ownerIdea = '', regressionNotes = [] }) {
  const user = [
    '=== TASK ===',
    'POLISH MODE: game is technically verified but product review demands improvements.',
    'Improve presentation and player experience WITHOUT regressing any verified mechanic, input behavior, score progression, or runtime property.',
    'Apply priorityFixes and address critique while keeping all mechanics working.',
    'Return the FULL corrected JSON (title/css/html/js).',
    '',
    acceptanceRules(),
    ...(regressionNotes.length
      ? ['', '=== PREVIOUS POLISH REGRESSIONS - DO NOT REPEAT ===', ...regressionNotes.map((n) => `- ${n}`)]
      : []),
    '',
    '=== PLAYTEST REVIEW ===',
    JSON.stringify(playtest, null, 2),
    '',
    '=== ORIGINAL OWNER IDEA ===',
    ownerIdea || '(no additional owner brief)',
    '',
    '=== GAME DESIGN BRIEFING ===',
    JSON.stringify(gdd, null, 2),
    '',
    '=== CURRENT VERIFIED IMPLEMENTATION (json with title/css/html/js) ===',
    JSON.stringify(design, null, 2),
    '',
    '=== MICRO-ENGINE SOURCE ===',
    engineSource()
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.3, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}