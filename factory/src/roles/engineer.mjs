import fs from 'node:fs';
import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt, loadSkill } from '../util/skills.mjs';
import { lessonsFor } from '../memory/store.mjs';
import { PATHS } from '../config.mjs';
import { ownerRequirementIds } from '../contract/owner.mjs';

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
    '- The IMMUTABLE OWNER CONTRACT is authoritative. Stable MH/NG IDs and their mapped acceptance/probe IDs must survive Build, Repair, Fresh Rebuild and Polish.',
    '- Implement every explicit Must-Have and every GDD mechanic as a visible, playable behavior; do not replace requested mechanics with decorative stand-ins.',
    '- If the brief asks for a boss/Titan, it must be visually distinct and mechanically meaningful, not just a normal enemy rectangle.',
    '- If the brief asks for salvage/upgrades, collecting/choosing an upgrade must change a real gameplay value or ability and show clear feedback.',
    '- If the brief asks for a risk/reward choice, implement an actual player choice with distinct outcomes.',
    '- Preserve readable HUD layout with no overlapping labels.',
    '- Score must increase deterministically by the early verifier evidence point under the fixed keyboard/pointer input sequence. Never make this depend on a lucky random collision, rare spawn, or precise aim.',
    '- Every product-specific requirement must emit the exact bounded runtime event required by its supplied probe when that probe kind requires an event.',
    '- The game must remain playable under WASD/arrows/Space/Enter and pointer clicks as applicable.',
    '- Use ONLY APIs and properties that actually exist in the supplied MICRO-ENGINE SOURCE. Do not invent engine methods or state containers.',
    '- Prefer simple scene-owned arrays/state over unnecessary abstractions. game.currentScene is a safe getter for the active registered scene after play has started.',
    '- No external URLs or assets. Keep runtime free of console/page/probe errors and maintain >=30 FPS.',
    '- Keep JavaScript multiline and reasonably readable.'
  ].join('\n');
}

function productionContract(ownerContract, gdd) {
  if (!ownerContract?.contractSha256 || ownerContract.immutable !== true) {
    throw new Error('Engineer requires immutable Owner Contract');
  }
  const requirementIds = ownerRequirementIds(ownerContract);
  if (!requirementIds.length) throw new Error('Engineer Owner Contract has no requirements');

  const acceptanceCriteria = Array.isArray(gdd?.acceptanceCriteria) ? gdd.acceptanceCriteria : [];
  const requirementProbes = Array.isArray(gdd?.probePlan?.requirementProbes) ? gdd.probePlan.requirementProbes : [];
  for (const requirementId of requirementIds) {
    const acceptance = acceptanceCriteria.filter((item) => item?.ownerRequirementId === requirementId);
    const probes = requirementProbes.filter((item) => item?.ownerRequirementId === requirementId);
    if (acceptance.length !== 1 || acceptance[0]?.id !== `AC-${requirementId}`) {
      throw new Error(`Engineer missing stable acceptance mapping for ${requirementId}`);
    }
    if (probes.length !== 1 || probes[0]?.id !== `PR-${requirementId}` || probes[0]?.acceptanceId !== `AC-${requirementId}`) {
      throw new Error(`Engineer missing stable probe mapping for ${requirementId}`);
    }
  }

  return {
    ownerContract,
    acceptanceProbeMapping: {
      acceptanceCriteria,
      requirementProbes
    }
  };
}

function contractSections(ownerContract, gdd) {
  const context = productionContract(ownerContract, gdd);
  return [
    '=== IMMUTABLE OWNER CONTRACT ===', JSON.stringify(context.ownerContract, null, 2), '',
    '=== ACCEPTANCE + PROBE TRACEABILITY ===', JSON.stringify(context.acceptanceProbeMapping, null, 2)
  ];
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

export async function buildGame({ gdd, ownerIdea = '', ownerContract }) {
  const user = [
    '=== TASK ===',
    'Implement this game now (fresh build). Output ONLY strict JSON with slots title/css/html/js.',
    '', acceptanceRules(), '',
    ...contractSections(ownerContract, gdd), '',
    '=== ORIGINAL OWNER IDEA (context only; immutable contract above is authoritative) ===', ownerIdea || '(no additional owner brief)', '',
    '=== GAME DESIGN BRIEFING ===', JSON.stringify(gdd, null, 2), '',
    '=== MICRO-ENGINE SOURCE (injected automatically before your js - do NOT repeat it) ===', engineSource()
  ].join('\n');
  const { text } = await chat({ role: 'engineer', operation: 'build', system: systemPrompt(), user, json: true, temperature: 0.3, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}

export async function rebuildGame({ gdd, ownerIdea = '', ownerContract, failureHistory = [] }) {
  const user = [
    '=== TASK ===',
    'ESCALATION MODE: targeted repairs have stalled. DISCARD the previous implementation architecture and build a genuinely fresh implementation from scratch.',
    'Do not copy the prior code structure. Solve the immutable Owner Contract with the simplest robust state model that can pass verification.',
    'Output ONLY strict JSON with slots title/css/html/js.',
    '', acceptanceRules(), '',
    ...contractSections(ownerContract, gdd), '',
    '=== FAILURES THE NEW ARCHITECTURE MUST AVOID ===',
    ...(failureHistory.length ? failureHistory.map((f) => `- ${f}`) : ['- Previous repair attempts made no progress.']),
    '', '=== ORIGINAL OWNER IDEA (context only) ===', ownerIdea || '(no additional owner brief)', '',
    '=== GAME DESIGN BRIEFING ===', JSON.stringify(gdd, null, 2), '',
    '=== MICRO-ENGINE SOURCE ===', engineSource()
  ].join('\n');
  const { text } = await chat({ role: 'engineer', operation: 'rebuild', system: systemPrompt(), user, json: true, temperature: 0.6, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}

export async function repairGame({ gdd, design, failureSummary, ownerIdea = '', ownerContract }) {
  const user = [
    '=== TASK ===',
    'REPAIR MODE: previous attempt failed verification. Fix exactly the listed failures while preserving every behavior and every Owner requirement that already has evidence.',
    'IMPORTANT: do NOT return previous code unchanged or near-unchanged.',
    'You MUST actually modify js/css/html so output passes verification.',
    '', acceptanceRules(), '',
    ...contractSections(ownerContract, gdd), '',
    '=== FAILURE EVIDENCE ===', failureSummary, '',
    '=== ORIGINAL OWNER IDEA (context only) ===', ownerIdea || '(no additional owner brief)', '',
    '=== GAME DESIGN BRIEFING ===', JSON.stringify(gdd, null, 2), '',
    '=== PREVIOUS ATTEMPT (json with title/css/html/js) ===', JSON.stringify(design, null, 2), '',
    '=== MICRO-ENGINE SOURCE ===', engineSource()
  ].join('\n');
  const { text } = await chat({ role: 'engineer', operation: 'repair', system: systemPrompt(), user, json: true, temperature: 0.3, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}

export async function polishGame({ gdd, design, playtest, ownerIdea = '', ownerContract, regressionNotes = [] }) {
  const user = [
    '=== TASK ===',
    'POLISH MODE: game is technically and product-fidelity verified but product review demands improvements.',
    'Improve presentation and player experience WITHOUT regressing any verified mechanic, input behavior, score progression, runtime property or Owner-contract evidence.',
    'Apply priorityFixes and address critique while keeping all mechanics working.',
    'Return the FULL corrected JSON (title/css/html/js).',
    '', acceptanceRules(), '',
    ...contractSections(ownerContract, gdd),
    ...(regressionNotes.length ? ['', '=== PREVIOUS POLISH REGRESSIONS - DO NOT REPEAT ===', ...regressionNotes.map((n) => `- ${n}`)] : []),
    '', '=== PLAYTEST REVIEW ===', JSON.stringify(playtest, null, 2), '',
    '=== ORIGINAL OWNER IDEA (context only) ===', ownerIdea || '(no additional owner brief)', '',
    '=== GAME DESIGN BRIEFING ===', JSON.stringify(gdd, null, 2), '',
    '=== CURRENT VERIFIED IMPLEMENTATION (json with title/css/html/js) ===', JSON.stringify(design, null, 2), '',
    '=== MICRO-ENGINE SOURCE ===', engineSource()
  ].join('\n');
  const { text } = await chat({ role: 'engineer', operation: 'polish', system: systemPrompt(), user, json: true, temperature: 0.3, maxTokens: 12000 });
  return validateDesign(extractJson(text));
}
