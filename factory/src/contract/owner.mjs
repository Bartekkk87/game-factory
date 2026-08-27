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

function requirementList(prefix, items) {
  return items.map((text, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    text,
    immutable: true
  }));
}

function contractDigest(contractWithoutSha) {
  return crypto.createHash('sha256').update(JSON.stringify(contractWithoutSha)).digest('hex');
}

export function createOwnerContract({ idea = '', source = 'unknown' } = {}) {
  const rawIdea = String(idea || '').trim();
  const sections = parseSections(rawIdea);
  let mustHaveTexts = findSection(sections, [/^muss have$/, /^must have/, /^must haves/]);
  const noGoTexts = findSection(sections, [/^no gos?$/, /^no go/, /^nicht erlaubt/, /^dont/, /^do not/]);

  if (!mustHaveTexts.length && rawIdea) {
    const compact = rawIdea.replace(/\s+/g, ' ').trim();
    mustHaveTexts = [compact];
  }

  const base = {
    schema: 'game-factory.owner-contract/1.0',
    source,
    ownerBriefSha256: crypto.createHash('sha256').update(rawIdea).digest('hex'),
    mustHaves: requirementList('MH', mustHaveTexts),
    noGos: requirementList('NG', noGoTexts),
    originalBrief: rawIdea,
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
