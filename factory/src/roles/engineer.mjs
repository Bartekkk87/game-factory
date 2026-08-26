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
    'Implement this game now (fresh build). Output ONLY the strict JSON with slots title/css/html/js.',
    '',
    '=== COMPACT OUTPUT RULE (CRITICAL - output is hard-capped at ~8000 tokens) ===',
    'Your ENTIRE JSON response must stay under 8000 tokens or it will be cut off and REJECTED.',
    '- Write minimal, complete code: NO comments, NO blank lines, short variable names.',
    '- Aim for max ~350 lines of js total. A complete small game beats an incomplete big one.',
    '- Keep css/html tiny. Put all effort into a playable core loop that actually renders.',
    '- Keep JavaScript MULTILINE and readable. Never minify the entire game onto one line.',
    '- Use exactly: const game = new GF.Game({...}); then game.add(...); then game.titleScreen(...).',
    '- Never chain new GF.Game(...).add(...). Every object method must close with } before its comma.',
    '- Scene methods call game.addScore(), game.hitStop(), game.shake() and game.burst(); never this.addScore().',
    '- Check all braces, parentheses and commas before returning the JSON.',
    '',
    '=== GAME DESIGN BRIEFING ===',
    JSON.stringify(gdd, null, 2),
    '',
    '=== MICRO-ENGINE SOURCE (injected automatically before your js - do NOT repeat it) ===',
    engineSource(),
    '',
    '=== CRITICAL RENDERING RULES (violation = black screenshots = FAIL) ===',
    '1. Scene.draw(ctx) receives ONLY ctx (canvas 2D context). Do NOT use game.dt, game.time, or any game.* inside draw().',
    '2. Draw EVERY frame: background, all entities, particles, UI. The verifier takes screenshots mid-play.',
    '3. Use ONLY Canvas 2D APIs that work in headless Chromium: NO ctx.filter (blur), NO CSS filters, NO offscreenCanvas.',
    '4. Background must be drawn in Scene.draw (engine clears with game.background, then calls scene.draw).',
    '5. Colors must contrast with background (engine background = game.background from constructor).',
    '6. Player/enemy/projectile draw() methods must actually call ctx.fill/stroke with visible colors.',
    '7. Do NOT rely on engine HUD (score text) for visibility - that only draws in "playing" state.',
    '8. Auto-play logic for probe goes in Scene.update(dt), NOT in draw().',
    '9. game.hitStop(dur) is a METHOD. Call it: game.hitStop(0.1). NEVER assign: game.hitStop = 0.1 (THIS BREAKS).',
    '10. If you add a "salvage" or similar scene, it MUST have a draw() that renders visible content.',
    '11. QUALITY GATE: target at least 7/10. A flat background with a few rectangles will fail.',
    '12. Draw at least three environmental layers: base, patterned structure and animated detail.',
    '13. Add a framed HUD with labeled health, score, objective and concise controls.',
    '14. Use distinct silhouettes, outlines or glows, telegraphs, impact particles and screen feedback.',
    '15. Implement the GDD core hook visibly; do not replace it with a generic dodge/shooter loop.',
    '16. The score MUST increase within four seconds of ordinary simulated movement/click input.',
    '17. Award points for hits, pickups or survival ticks; never require a difficult kill before the first point.'
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.35, maxTokens: 16000 });
  return validateDesign(extractJson(text));
}

export async function repairGame({ gdd, design, failureSummary }) {
  const user = [
    '=== TASK ===',
    'REPAIR MODE: The previous attempt failed automated verification.',
    'Fix exactly the listed failures while preserving everything that worked.',
    'IMPORTANT: Do NOT return the previous code unchanged or near-unchanged.',
    'You MUST actually modify js/css/html so that every listed check passes.',
    'If a check measures score increase via simulated input, make sure the game',
    'auto-plays/responds to keyboard+mouse events and the __GF__ probe reports state=playing and a rising score.',
    'Guarantee score growth within four seconds by awarding points for hits, movement, pickups or survival ticks.',
    'Do not require several precise clicks or a full enemy kill before awarding the first point.',
    'VISUAL RENDERING: Ensure Scene.draw(ctx) draws visible content:',
    '- Draw background, player, enemies, projectiles and particles every frame',
    '- Do NOT use ctx.filter, CSS filters, or game.dt in draw()',
    '- game.hitStop() is a METHOD (call it), not a property',
    '- Keep the corrected JavaScript multiline. Check every brace, parenthesis and comma.',
    '- Define const game = new GF.Game({...}); do not chain .add() onto the constructor.',
    '- Scene methods must use game.addScore(), game.hitStop(), game.shake() and game.burst().',
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

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.4, maxTokens: 16000 });
  return validateDesign(extractJson(text));
}

export async function polishGame({ gdd, design, playtest }) {
  const user = [
    '=== TASK ===',
    'POLISH MODE: The game works technically but the visual/experience review demands improvements.',
    'Apply the priorityFixes and address the critique while keeping all mechanics working.',
    'Every priorityFix is mandatory and must cause an obvious screenshot-visible change.',
    'Replace sparse flat scenes with layered environmental art, animated detail and strong composition.',
    'Add framed HUD panels, labels, objective/control guidance, outlines, telegraphs and impact feedback.',
    'Preserve and visibly emphasize the GDD core mechanic instead of simplifying to generic gameplay.',
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

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.6, maxTokens: 16000 });
  return validateDesign(extractJson(text));
}
