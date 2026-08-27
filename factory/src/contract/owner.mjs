import crypto from 'node:crypto';

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) freezeDeep(item);
  return Object.freeze(value);
}

function normalizeHeading(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseSections(markdown) {
  const sections = new Map();
  let current = '__root__';
  sections.set(current, []);
  for (const rawLine of String(markdown || '').split(/\r?\n/)) {
    const heading = rawLine.match(/^#{2,6}\s+(.+?)\s*$/);
    if (heading) {
      current = normalizeHeading(heading[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    sections.get(current).push(rawLine);
  }
  return sections;
}

function bullets(lines = []) {
  return lines
    .map((line) => line.match(/^\s*[-*+]\s+(.+?)\s*$/)?.[1]?.trim())
    .filter(Boolean);
}

function findSection(sections, patterns) {
  for (const [heading, lines] of sections.entries()) {
    if (patterns.some((pattern) => pattern.test(heading))) return bullets(lines);
  }
  return [];
}

function requirementList(prefix, items, mode) {
  return items.map((item, index) => {
    const text = typeof item === 'string' ? item : item.text;
    const provenance = typeof item === 'string'
      ? { mode, itemIndex: index }
      : { mode, itemIndex: item.fragmentIndex ?? index };
    return {
      id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
      text,
      provenance,
      immutable: true
    };
  });
}

function contractDigest(contractWithoutSha) {
  return crypto.createHash('sha256').update(JSON.stringify(contractWithoutSha)).digest('hex');
}

const AMBIGUITY = /\b(?:maybe|perhaps|possibly|might|could|optional|ideally|nice to have|vielleicht|eventuell|gegebenenfalls|ggf|wenn möglich|waere schoen|wäre schön)\b/i;
const NO_GO = /(?:^\s*no\b|\b(?:do not|don't|never|avoid|must not|mustn't|not allowed|forbidden|darf nicht|dürfen nicht|niemals|vermeide|kein(?:e|en|er|es)?)\b)/i;
const CONTEXT_ONLY = /\b(?:inspired by|inspiration|inspiriert von|angelehnt an|feels? like|feel like|soll sich anf(?:ü|ue|u)hlen wie|im stil von|style of)\b/i;
const EXPLICIT_OBLIGATION = /\b(?:must|shall|required|requires?|needs? to|has to|have to|muss|müssen|soll|sollen|ist erforderlich|sind erforderlich)\b/i;
const DIRECT_BUILD_REQUEST = /^\s*(?:please\s+)?(?:build|create|make|produce|develop|baue|bau|erstelle|entwickle)\b/i;

function freeformFragments(rawIdea) {
  const fragments = [];
  for (const rawLine of String(rawIdea || '').split(/\r?\n/)) {
    if (/^\s*#{1,6}\s+/.test(rawLine)) continue;
    const line = rawLine.replace(/^\s*[-*+]\s+/, '').trim();
    if (!line) continue;
    for (const part of line.split(/(?<=[.!?])\s+|;\s*/)) {
      const text = part.trim();
      if (text) fragments.push({ text, fragmentIndex: fragments.length });
    }
  }
  return fragments;
}

function decomposeFreeform(rawIdea) {
  const mustHaves = [];
  const noGos = [];
  const unknowns = [];
  for (const fragment of freeformFragments(rawIdea)) {
    if (AMBIGUITY.test(fragment.text)) unknowns.push(fragment);
    else if (NO_GO.test(fragment.text)) noGos.push(fragment);
    else if (CONTEXT_ONLY.test(fragment.text)) unknowns.push(fragment);
    else if (EXPLICIT_OBLIGATION.test(fragment.text) || DIRECT_BUILD_REQUEST.test(fragment.text)) mustHaves.push(fragment);
    else unknowns.push(fragment);
  }
  return { mustHaves, noGos, unknowns };
}

export function createOwnerContract({ idea = '', source = 'unknown' } = {}) {
  const originalBrief = String(idea ?? '');
  const rawIdea = originalBrief.trim();
  const sections = parseSections(rawIdea);

  const explicitMustHaves = findSection(sections, [/^muss have$/, /^must have/, /^must haves/]);
  const explicitNoGos = findSection(sections, [/^no gos?$/, /^no go/, /^nicht erlaubt/, /^dont/, /^do not/]);

  let mustHaveItems = explicitMustHaves;
  let noGoItems = explicitNoGos;
  let unknownItems = [];
  let decompositionMode = 'explicit-sections';

  if (!explicitMustHaves.length && !explicitNoGos.length && rawIdea) {
    const decomposed = decomposeFreeform(rawIdea);
    mustHaveItems = decomposed.mustHaves;
    noGoItems = decomposed.noGos;
    unknownItems = decomposed.unknowns;
    decompositionMode = 'deterministic-freeform-v2';
  }

  if (!rawIdea) {
    mustHaveItems = ['Produce one original, complete and highly playable browser game.'];
    decompositionMode = 'system-default';
  }

  const base = {
    schema: 'game-factory.owner-contract/1.0',
    source,
    ownerBriefSha256: crypto.createHash('sha256').update(originalBrief).digest('hex'),
    decomposition: {
      version: decompositionMode,
      ambiguitiesPreservedAsUnknown: true
    },
    mustHaves: requirementList('MH', mustHaveItems, decompositionMode),
    noGos: requirementList('NG', noGoItems, decompositionMode),
    unknowns: requirementList('UN', unknownItems, decompositionMode),
    originalBrief,
    immutable: true
  };
  const contract = { ...base, contractSha256: contractDigest(base) };
  return freezeDeep(contract);
}

export function ownerRequirementIds(ownerContract) {
  return [
    ...(ownerContract?.mustHaves || []).map((r) => r.id),
    ...(ownerContract?.noGos || []).map((r) => r.id)
  ];
}
