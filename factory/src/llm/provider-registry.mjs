const BUILTIN_PROVIDERS = Object.freeze({
  openai: Object.freeze({ id: 'openai', baseUrl: 'https://api.openai.com/v1', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' }),
  deepseek: Object.freeze({ id: 'deepseek', baseUrl: 'https://api.deepseek.com', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' }),
  openrouter: Object.freeze({ id: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', adapter: 'openai-compatible-chat', chatPath: '/chat/completions', openRouterHeaders: true }),
  googleai: Object.freeze({ id: 'googleai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' }),
  huggingface: Object.freeze({ id: 'huggingface', baseUrl: 'https://router.huggingface.co/v1', adapter: 'openai-compatible-chat', chatPath: '/chat/completions' })
});

export const OPENAI_PRODUCTION_CREDENTIAL_ENV = 'OPENAI_PRODUCTION';
export const OPENROUTER_CREDENTIAL_ENV = Object.freeze({
  production: 'OPENROUTER_PRODUCTION',
  benchmark: 'OPENROUTER_BENCHMARK',
  improvement: 'OPENROUTER_IMPROVEMENT'
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
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new UnknownProviderError('GF_PROVIDER_REGISTRY_JSON', `invalid JSON: ${e.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UnknownProviderError('GF_PROVIDER_REGISTRY_JSON', 'expected an object');
  }
  return parsed;
}

export function getProviderRecord(providerId) {
  const id = String(providerId || '').trim().toLowerCase();
  if (!id) throw new UnknownProviderError('(empty)');
  const custom = configuredProviders()[id];
  const record = custom ? { id, ...custom } : BUILTIN_PROVIDERS[id];
  if (!record) throw new UnknownProviderError(id);
  if (!record.baseUrl || record.adapter !== 'openai-compatible-chat') {
    throw new UnknownProviderError(id, 'provider record is incomplete or adapter unsupported');
  }
  return { ...record, baseUrl: String(record.baseUrl).replace(/\/$/, '') };
}

const suffix = (providerId) => providerId.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

export function runtimeProvider(providerId, { credentialLane = 'production' } = {}) {
  const record = getProviderRecord(providerId);
  const key = suffix(record.id);
  const lane = String(credentialLane || 'production').trim().toLowerCase();
  const globalProvider = process.env.GF_LLM_PROVIDER?.trim().toLowerCase() || null;
  const providerBase = process.env[`GF_LLM_BASE_URL_${key}`]?.trim();
  const globalBase = globalProvider === record.id ? process.env.GF_LLM_BASE_URL?.trim() : null;
  const baseUrl = (providerBase || globalBase || record.baseUrl).replace(/\/$/, '');

  if (record.id === 'openrouter') {
    const credentialEnv = OPENROUTER_CREDENTIAL_ENV[lane];
    if (!credentialEnv) throw new UnknownProviderError('openrouter', `unknown credential lane ${credentialLane}`);
    return {
      ...record,
      baseUrl,
      apiKey: process.env[credentialEnv]?.trim() || '',
      credentialLane: lane,
      credentialEnv,
      legacyCredentialFallback: false
    };
  }

  if (record.id === 'openai') {
    if (lane !== 'production') throw new UnknownProviderError('openai', `unsupported credential lane ${credentialLane}`);
    return {
      ...record,
      baseUrl,
      apiKey: process.env[OPENAI_PRODUCTION_CREDENTIAL_ENV]?.trim() || '',
      credentialLane: 'production',
      credentialEnv: OPENAI_PRODUCTION_CREDENTIAL_ENV,
      legacyCredentialFallback: false
    };
  }

  if (lane !== 'production') throw new UnknownProviderError(record.id, `unsupported credential lane ${credentialLane}`);
  const providerKey = process.env[`GF_LLM_API_KEY_${key}`]?.trim();
  const genericKeyAllowed = globalProvider ? globalProvider === record.id : false;
  const genericKey = genericKeyAllowed ? process.env.GF_LLM_API_KEY?.trim() : null;
  return {
    ...record,
    baseUrl,
    apiKey: providerKey || genericKey || '',
    credentialLane: 'production',
    credentialEnv: providerKey ? `GF_LLM_API_KEY_${key}` : 'GF_LLM_API_KEY',
    legacyCredentialFallback: false
  };
}

export function providerRegistrySnapshot() {
  return JSON.parse(JSON.stringify(BUILTIN_PROVIDERS));
}
