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
    '12. Draw at least FOUR environmental layers: far background, mid structure, foreground detail, animated effects.',
    '13. Add a framed HUD with labeled health, score, objective, concise controls AND visible status icons.',
    '14. Use distinct silhouettes, colored outlines/glows, telegraphs, impact particles and screen feedback (flash, shake).',
    '15. Implement the GDD core hook visibly; do not replace it with a generic dodge/shooter loop.',
    '16. The score MUST increase within four seconds of ordinary simulated movement/click input.',
    '17. Award points for hits, pickups or survival ticks; never require a difficult kill before the first point.',
    '18. VISUAL MINIMUMS: gradient/patterned bg, parallax/motion, 3+ entity types with unique colors/shapes, 5+ particle types.',
    '19. Every entity needs outline/glow + unique color + distinct shape. Enemies must look different from player AND each other.',
    '20. Background MUST have animated elements (scrolling, pulsing, drifting, rotating) visible in screenshots.',
    '21. HUD needs: score, health bar, objective text, controls hint, AND visible status indicators (ammo, cooldown, etc.).',
    '22. CONCRETE BACKGROUND PATTERN: implement at least 3 of these in drawBackground():',
    '    - Layer 1: multi-stop gradient + slow auto-scrolling starfield/dot grid (translate with game.time)',
    '    - Layer 2: geometric shapes (hex grid, circuit lines, organic blobs) with pulsing opacity',
    '    - Layer 3: foreground debris/silhouettes that parallax faster than mid layer',
    '    - Layer 4: screen-space effects (vignette, scanlines, color shifts, particle rain)',
    '23. CONCRETE ENTITY REQUIREMENTS: each enemy type needs distinct draw() with:',
    '    - unique base shape (circle, triangle, square, polygon, custom path)',
    '    - colored outline (2-3px) + inner glow effect (multiple strokes with decreasing opacity)',
    '    - internal detail (core, eye, pattern, rotation indicator)',
    '    - telegraph animation before attack (scale pulse, color flash, particle trail)',
    '24. CONCRETE PARTICLE SYSTEM: maintain at least 50 active particles of 5+ types:',
    '    - ambient: constant slow drift (dust, sparks, motes)',
    '    - trail: follow player/enemies (fading line, shrinking circles)',
    '    - impact: burst on hit/death (expanding ring, directional shards)',
    '    - pickup: magnetic attraction to player (spiral, glow pulse)',
    '    - UI: screen-space effects (damage flash, score pop, combo counter)',
    '25. CONCRETE HUD: implement drawHUD(ctx) with ALL of these:',
    '    - framed panel (roundRect) with semi-transparent bg + border',
    '    - health: labeled bar (current/max) with color gradient (green->yellow->red)',
    '    - score: large number with outline, optional combo multiplier display',
    '    - objective: one-line text with icon, updates dynamically',
    '    - controls: compact hint (WASD icons, mouse icon, key bindings)',
    '    - status row: 3+ icons with cooldown/progress rings (weapon, ability, special)',
    '26. SCREEN FEEDBACK: mandatory implementations:',
    '    - game.flash(color, intensity) for damage/pickup',
    '    - game.shake(magnitude, duration) for impact',
    '    - game.hitStop(duration) for hit pause (CALL METHOD, not assign)',
    '    - screen-space damage indicator (directional red arc at screen edge)',
    '27. MANDATORY VERIFICATION before returning: visually inspect your draw() - if it looks like "circles on gradient", REWRITE.'
  ].join('\n');

  const { text } = await chat({ role: 'engineer', system: systemPrompt(), user, json: true, temperature: 0.5, maxTokens: 16000 });
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
    'VISUAL RENDERING: Ensure Scene.draw(ctx) draws RICH visible content:',
    '- Draw FOUR background layers: far parallax starfield, mid geometric structures, foreground debris, screen FX',
    '- Player/enemies/components: unique shapes + 2-3px colored outline + inner glow + internal detail',
    '- Minimum 5 particle types: ambient drift, trails, impact bursts, pickup spirals, UI pops. ALL in screenshots.',
    '- HUD: framed panel + health BAR (gradient) + score (outlined) + objective + controls + 3+ status icons with cooldown rings',
    '- Background MUST have: multi-stop gradient, auto-scroll starfield, pulsing geometric shapes, foreground parallax, vignette/scanlines',
    '- Each enemy type: unique base shape (triangle/square/polygon) + colored outline + inner glow + telegraph animation',
    '- Screen feedback: flash on damage/pickup, shake on impact, hitStop() METHOD call, directional damage indicator',
    '- Do NOT use ctx.filter, CSS filters, or game.dt in draw()',
    '- game.hitStop() is a METHOD (call it), not a property',
    '- Keep JavaScript multiline. Check every brace, parenthesis, comma.',
    '- Define const game = new GF.Game({...}); do not chain .add() onto constructor.',
    '- Scene methods must use game.addScore(), game.hitStop(), game.shake() and game.burst().',
    '- MANDATORY: if your draw() looks like "circles on gradient", REWRITE completely.',
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
    'POLISH MODE: The game works technically but the visual/experience review demands STRONG improvements.',
    'Every priorityFix is MANDATORY and must cause an OBVIOUS screenshot-visible change.',
    'REPLACE any sparse/flat scenes with 4-layer environmental art: far parallax starfield, mid geometric structures, foreground debris, screen FX.',
    'Add framed HUD panel with: score, health BAR (gradient), objective text, controls hint, 3+ status icons with cooldown rings. High contrast.',
    'Every entity: unique base shape (triangle/square/polygon) + 2-3px colored outline + inner glow + telegraph animation. Enemies differ from each other.',
    'Particles: ambient drift, trails, impact bursts, pickup spirals, UI pops - minimum 5 types, ALL visible in screenshots.',
    'Background: multi-stop gradient + auto-scroll starfield + pulsing geometric shapes + foreground parallax + vignette/scanlines. Animation MUST show in screenshots.',
    'Screen feedback: flash on damage/pickup, shake on impact, hitStop() METHOD call, directional damage indicator.',
    'Each enemy type MUST have unique draw(): distinct shape + colored outline + glow + internal detail + attack telegraph.',
    'Preserve and VISIBLY EMPHASIZE the GDD core mechanic. Do NOT simplify to generic gameplay.',
    'MANDATORY: if your draw() looks like "circles on gradient", REWRITE completely.',
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
