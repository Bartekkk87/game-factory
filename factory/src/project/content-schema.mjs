import { sha256 } from './contracts.mjs';

const TYPES = new Set(['string', 'number', 'integer', 'boolean', 'object', 'array']);

export function createContentSchema(input = {}) {
  const id = String(input.id || '').trim();
  const version = String(input.version || '').trim();
  if (!id || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('content schema requires id and semantic version');
  const fields = Object.fromEntries(Object.entries(input.fields || {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, definition]) => {
    if (!TYPES.has(definition?.type)) throw new Error(`content schema field ${name} has unsupported type`);
    return [name, { type: definition.type, required: definition.required === true }];
  }));
  if (!Object.keys(fields).length) throw new Error('content schema requires fields');
  const schema = {
    schemaVersion: 'project-game.content-schema/v1',
    id,
    version,
    fields,
    additionalFields: input.additionalFields === true
  };
  return Object.freeze({ ...schema, contractSha256: sha256(JSON.stringify(schema)) });
}

function matchesType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}

export function validateContentRecords(schema, records) {
  if (schema?.schemaVersion !== 'project-game.content-schema/v1') throw new Error('content schema invalid');
  if (!Array.isArray(records)) throw new Error('content records must be an array');
  const errors = [];
  records.forEach((record, index) => {
    for (const [field, definition] of Object.entries(schema.fields)) {
      if (definition.required && record?.[field] === undefined) errors.push(`${index}.${field}:required`);
      else if (record?.[field] !== undefined && !matchesType(record[field], definition.type)) errors.push(`${index}.${field}:type`);
    }
    if (!schema.additionalFields) {
      for (const field of Object.keys(record || {})) if (!schema.fields[field]) errors.push(`${index}.${field}:unknown`);
    }
  });
  return { pass: errors.length === 0, errors, schemaId: schema.id, schemaVersion: schema.version };
}
