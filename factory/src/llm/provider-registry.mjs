const BUILTIN_PROVIDERS = Object.freeze({
  openai: Object.freeze({ id: 'openai', baseUrl: 'https://api.openai.com/v1', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' }),
  deepseek: Object.freeze({ id: 'deepseek', baseUrl: 'https://api.deepseek.com', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' }),
  openrouter: Object.freeze({ id: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', adapter: 'openai-compatible-chat', chatPath: '/chat/completions', openRouterHeaders: true }),
  googleai: Object.freeze({ id: 'googleai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' }),
  huggingface: Object.freeze({ id: 'huggingface', baseUrl: 'https://router.huggingface.co/v1', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' })
});

export class UnknownProviderError extends Error {
  constructor(provider, detail = '') {
    super(`Unknown LLM provider: ${provider}${detail ? ` (${detail})` : ''}`);
    this.name = 'UnknownProviderError';
    this.provider = provider;
  }
}

function configuredProviders() {
  const raw = process.env.GF_PROVIDER_REGISTRY_JSON?.trim();
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { throw new UnknownProviderError('GF_PROVIDER_REGISTRY_JSON', `invalid JSON: ${e.message}`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new UnknownProviderError('GF_PROVIDER_REGISTRY_JSON', 'expected an object');
  return parsed;
}

export function getProviderRecord(providerId) {
  const id = String(providerId || '').trim().toLowerCase();
  if (!id) throw new UnknownProviderError('(empty)');
  const custom = configuredProviders()[id];
  const record = custom ? { id, ...custom } : BUILTIN_PROVIDERS[id];
  if (!record) throw new UnknownProviderError(id);
  if (!record.baseUrl || record.adapter !== 'openai-compatible-chat') throw new UnknownProviderError(id, 'provider record is incomplete or adapter unsupported');
  return { ...record, baseUrl: String(record.baseUrl).replace(/\/$/, '') };
}

function suffix(providerId) {
  return providerId.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function runtimeProvider(providerId) {
  const record = getProviderRecord(providerId);
  const key = suffix(record.id);
  const globalProvider = process.env.GF_LLM_PROVIDER?.trim().toLowerCase() || null;
  const providerBase = process.env[`GF_LLM_BASE_URL_${key}`]?.trim();
  const globalBase = globalProvider === record.id ? process.env.GF_LLM_BASE_URL?.trim() : null;
  const providerKey = process.env[`GF_LLM_API_KEY_${key}`]?.trim();
  const genericKeyAllowed = globalProvider ? globalProvider === record.id : record.id === 'openai';
  const genericKey = genericKeyAllowed ? process.env.GF_LLM_API_KEY?.trim() : null;
  return {
    ...record,
    baseUrl: (providerBase || globalBase || record.baseUrl).replace(/\/$/, ''),
    apiKey: providerKey || genericKey || ''
  };
}

export function providerRegistrySnapshot() {
  return JSON.parse(JSON.stringify(BUILTIN_PROVIDERS));
}
