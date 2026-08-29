const GPT56_LONG_CONTEXT = Object.freeze({
  inputThresholdTokens: 272000,
  inputMultiplier: 2,
  cachedInputMultiplier: 2,
  outputMultiplier: 1.5
});

const caps = (overrides = {}) => Object.freeze({
  text: true,
  vision: false,
  jsonObject: true,
  structuredOutputs: false,
  reasoning: false,
  chatCompletions: true,
  responsesApi: false,
  contextWindow: null,
  maxOutputTokens: null,
  promptCaching: false,
  continuation: false,
  ...overrides
});

const requestShape = (overrides = {}) => Object.freeze({
  tokenParam: 'max_tokens',
  temperature: 'free',
  jsonMode: 'response_format',
  contractSource: 'openai-compatible-default',
  ...overrides
});

const model = ({
  provider,
  id,
  versionLabel = id,
  aliasKind = 'stable-id',
  benchmarkStatus = 'legacy',
  capabilities,
  requestShape: shape,
  pricing
}) => Object.freeze({
  provider,
  id,
  versionLabel,
  aliasKind,
  benchmarkStatus,
  productionDefault: false,
  capabilities: caps(capabilities),
  requestShape: requestShape(shape),
  pricing: Object.freeze(pricing)
});

const OPENAI_REASONING_REQUEST = Object.freeze({
  tokenParam: 'max_completion_tokens',
  temperature: 'unsupported',
  jsonMode: 'response_format',
  contractSource: 'production-evidence-2026-08-27'
});

// Provider data is pinned to explicit verification notes. Challenger entries are
// selectable only by explicit route configuration and are never production defaults.
const BUILTIN_MODELS = Object.freeze({
  'openai:gpt-5.6-sol': model({
    provider: 'openai',
    id: 'gpt-5.6-sol',
    aliasKind: 'rolling-alias',
    benchmarkStatus: 'rescue-candidate',
    capabilities: {
      vision: true,
      structuredOutputs: true,
      reasoning: true,
      responsesApi: true,
      contextWindow: 1050000,
      maxOutputTokens: 128000,
      promptCaching: true
    },
    requestShape: OPENAI_REASONING_REQUEST,
    pricing: {
      inputUsdPerM: 4,
      cachedInputUsdPerM: 0.4,
      outputUsdPerM: 20,
      longContext: GPT56_LONG_CONTEXT,
      source: 'openai-official-2026-08-27'
    }
  }),
  'openai:gpt-5.6-terra': model({
    provider: 'openai',
    id: 'gpt-5.6-terra',
    aliasKind: 'rolling-alias',
    benchmarkStatus: 'reference-candidate',
    capabilities: {
      vision: true,
      structuredOutputs: true,
      reasoning: true,
      responsesApi: true,
      contextWindow: 1050000,
      maxOutputTokens: 128000,
      promptCaching: true
    },
    requestShape: OPENAI_REASONING_REQUEST,
    pricing: {
      inputUsdPerM: 2,
      cachedInputUsdPerM: 0.2,
      outputUsdPerM: 12,
      longContext: GPT56_LONG_CONTEXT,
      source: 'openai-official-2026-08-27'
    }
  }),
  'openai:gpt-5.6-luna': model({
    provider: 'openai',
    id: 'gpt-5.6-luna',
    aliasKind: 'rolling-alias',
    benchmarkStatus: 'economy-candidate',
    capabilities: {
      vision: true,
      structuredOutputs: true,
      reasoning: true,
      responsesApi: true,
      contextWindow: 1050000,
      maxOutputTokens: 128000,
      promptCaching: true
    },
    requestShape: OPENAI_REASONING_REQUEST,
    pricing: {
      inputUsdPerM: 0.2,
      cachedInputUsdPerM: 0.02,
      outputUsdPerM: 1.2,
      longContext: GPT56_LONG_CONTEXT,
      source: 'openai-official-2026-08-27'
    }
  }),
  'openai:gpt-4o': model({
    provider: 'openai',
    id: 'gpt-4o',
    aliasKind: 'legacy-alias',
    benchmarkStatus: 'legacy',
    capabilities: { vision: true, structuredOutputs: true, contextWindow: 128000, maxOutputTokens: 16384, promptCaching: true },
    pricing: { inputUsdPerM: 2.5, cachedInputUsdPerM: 1.25, outputUsdPerM: 10, source: 'openai-official-2026-08-27' }
  }),
  'openai:gpt-4o-2024-08-06': model({
    provider: 'openai',
    id: 'gpt-4o-2024-08-06',
    versionLabel: '2024-08-06',
    benchmarkStatus: 'legacy',
    capabilities: { vision: true, structuredOutputs: true, contextWindow: 128000, maxOutputTokens: 16384, promptCaching: true },
    pricing: { inputUsdPerM: 2.5, cachedInputUsdPerM: 1.25, outputUsdPerM: 10, source: 'openai-official-2026-08-27' }
  }),
  'openai:gpt-4o-2024-11-20': model({
    provider: 'openai',
    id: 'gpt-4o-2024-11-20',
    versionLabel: '2024-11-20',
    benchmarkStatus: 'legacy',
    capabilities: { vision: true, structuredOutputs: true, contextWindow: 128000, maxOutputTokens: 16384, promptCaching: true },
    pricing: { inputUsdPerM: 2.5, cachedInputUsdPerM: 1.25, outputUsdPerM: 10, source: 'openai-official-2026-08-27' }
  }),
  'openai:gpt-4o-mini': model({
    provider: 'openai',
    id: 'gpt-4o-mini',
    aliasKind: 'legacy-alias',
    benchmarkStatus: 'legacy',
    capabilities: { vision: true, structuredOutputs: true, contextWindow: 128000, maxOutputTokens: 16384, promptCaching: true },
    pricing: { inputUsdPerM: 0.15, cachedInputUsdPerM: 0.075, outputUsdPerM: 0.6, source: 'openai-official-2026-08-27' }
  }),
  'openai:gpt-4o-mini-2024-07-18': model({
    provider: 'openai',
    id: 'gpt-4o-mini-2024-07-18',
    versionLabel: '2024-07-18',
    benchmarkStatus: 'legacy',
    capabilities: { vision: true, structuredOutputs: true, contextWindow: 128000, maxOutputTokens: 16384, promptCaching: true },
    pricing: { inputUsdPerM: 0.15, cachedInputUsdPerM: 0.075, outputUsdPerM: 0.6, source: 'openai-official-2026-08-27' }
  }),
  'deepseek:deepseek-v4-flash': model({
    provider: 'deepseek',
    id: 'deepseek-v4-flash',
    versionLabel: 'DeepSeek-V4-Flash-0731',
    aliasKind: 'rolling-alias',
    benchmarkStatus: 'candidate',
    capabilities: { reasoning: true, structuredOutputs: false, responsesApi: true, contextWindow: 1000000, maxOutputTokens: 384000, promptCaching: true },
    requestShape: { contractSource: 'provider-compatibility-default-unverified' },
    pricing: { inputUsdPerM: 0.14, cachedInputUsdPerM: 0.0028, outputUsdPerM: 0.28, source: 'deepseek-official-2026-08-27' }
  }),
  'deepseek:deepseek-v4-pro': model({
    provider: 'deepseek',
    id: 'deepseek-v4-pro',
    versionLabel: 'DeepSeek-V4-Pro',
    aliasKind: 'rolling-alias',
    benchmarkStatus: 'candidate',
    capabilities: { reasoning: true, structuredOutputs: false, responsesApi: false, contextWindow: 1000000, maxOutputTokens: 384000, promptCaching: true },
    requestShape: { contractSource: 'provider-compatibility-default-unverified' },
    pricing: { inputUsdPerM: 0.435, cachedInputUsdPerM: 0.003625, outputUsdPerM: 0.87, source: 'deepseek-official-2026-08-27' }
  }),
  'openrouter:deepseek/deepseek-chat-v3.1': model({
    provider: 'openrouter',
    id: 'deepseek/deepseek-chat-v3.1',
    versionLabel: 'DeepSeek-V3.1',
    aliasKind: 'stable-id',
    benchmarkStatus: 'challenger',
    capabilities: { jsonObject: true, structuredOutputs: true, reasoning: true, contextWindow: 163840, maxOutputTokens: 32768, promptCaching: true },
    requestShape: { contractSource: 'openrouter-compatible-default-unverified' },
    pricing: { inputUsdPerM: 0.25, cachedInputUsdPerM: 0.13, outputUsdPerM: 0.95, source: 'openrouter-official-2026-08-27' }
  }),
  'openrouter:z-ai/glm-5.3-flash': model({
    provider: 'openrouter',
    id: 'z-ai/glm-5.3-flash',
    versionLabel: 'GLM-5.3-Flash',
    aliasKind: 'stable-id',
    benchmarkStatus: 'challenger',
    capabilities: {
      vision: true,
      jsonObject: true,
      structuredOutputs: false,
      reasoning: true,
      contextWindow: 1310720,
      maxOutputTokens: 131072,
      promptCaching: true
    },
    requestShape: {
      tokenParam: 'max_tokens',
      temperature: 'free',
      jsonMode: 'response_format',
      reasoningEffort: 'low',
      reasoningExclude: true,
      providerSort: 'throughput',
      providerRequireParameters: true,
      contractSource: 'openrouter-official-model-metadata-and-routing-docs-2026-08-29'
    },
    pricing: {
      inputUsdPerM: 0.15,
      cachedInputUsdPerM: 0.03,
      outputUsdPerM: 0.50,
      source: 'openrouter-official-list-price-2026-08-29'
    }
  })
});

export class UnknownModelError extends Error {
  constructor(provider, modelId, detail = '') {
    super(`No registered model ${provider}:${modelId}${detail ? ` (${detail})` : ''}`);
    this.name = 'UnknownModelError';
    this.provider = provider;
    this.model = modelId;
  }
}

export class UnknownModelPricingError extends Error {
  constructor(provider, modelId, detail = '') {
    super(`No verified pricing for ${provider}:${modelId}${detail ? ` (${detail})` : ''}`);
    this.name = 'UnknownModelPricingError';
    this.provider = provider;
    this.model = modelId;
  }
}

function parseJsonEnv(name, ErrorType) {
  const raw = process.env[name]?.trim();
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ErrorType('configured', name, `invalid JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ErrorType('configured', name, 'expected an object');
  }
  return parsed;
}

function validPricing(value) {
  return value
    && Number.isFinite(Number(value.inputUsdPerM))
    && Number(value.inputUsdPerM) >= 0
    && Number.isFinite(Number(value.outputUsdPerM))
    && Number(value.outputUsdPerM) >= 0;
}

function normalizePricing(value, source) {
  if (!validPricing(value)) return null;
  return {
    inputUsdPerM: Number(value.inputUsdPerM),
    cachedInputUsdPerM: Number.isFinite(Number(value.cachedInputUsdPerM)) ? Number(value.cachedInputUsdPerM) : Number(value.inputUsdPerM),
    outputUsdPerM: Number(value.outputUsdPerM),
    ...(value.longContext ? { longContext: { ...value.longContext } } : {}),
    source
  };
}

function validRequestShape(value) {
  return value
    && ['max_tokens', 'max_completion_tokens'].includes(value.tokenParam)
    && ['free', 'unsupported'].includes(value.temperature)
    && ['response_format', 'none'].includes(value.jsonMode)
    && typeof value.contractSource === 'string'
    && value.contractSource.trim().length > 0;
}

function customRecord(provider, modelId) {
  const key = `${provider}:${modelId}`;
  const configured = parseJsonEnv('GF_MODEL_REGISTRY_JSON', UnknownModelError)[key];
  if (!configured) return null;
  const pricing = normalizePricing(configured.pricing, 'GF_MODEL_REGISTRY_JSON');
  if (!pricing) throw new UnknownModelError(provider, modelId, 'custom record needs valid pricing');
  if (!configured.capabilities || typeof configured.capabilities !== 'object') {
    throw new UnknownModelError(provider, modelId, 'custom record needs capabilities');
  }
  if (!validRequestShape(configured.requestShape)) {
    throw new UnknownModelError(provider, modelId, 'custom record needs explicit requestShape');
  }
  return {
    provider,
    id: modelId,
    versionLabel: configured.versionLabel || modelId,
    aliasKind: configured.aliasKind || 'configured',
    benchmarkStatus: configured.benchmarkStatus || 'configured',
    productionDefault: configured.productionDefault === true,
    capabilities: { ...caps(), ...configured.capabilities },
    requestShape: { ...configured.requestShape },
    pricing
  };
}

export function getModelRecord(provider, modelId) {
  const custom = customRecord(provider, modelId);
  if (custom) return JSON.parse(JSON.stringify(custom));
  const builtin = BUILTIN_MODELS[`${provider}:${modelId}`];
  if (!builtin) throw new UnknownModelError(provider, modelId);
  return JSON.parse(JSON.stringify(builtin));
}

export function getModelPricing(provider, modelId) {
  const key = `${provider}:${modelId}`;
  const legacyCustom = parseJsonEnv('GF_MODEL_PRICING_JSON', UnknownModelPricingError)[key];
  if (legacyCustom !== undefined) {
    const normalized = normalizePricing(legacyCustom, 'GF_MODEL_PRICING_JSON');
    if (!normalized) throw new UnknownModelPricingError(provider, modelId, 'invalid configured price');
    return normalized;
  }
  try {
    return getModelRecord(provider, modelId).pricing;
  } catch (error) {
    if (error instanceof UnknownModelError) throw new UnknownModelPricingError(provider, modelId);
    throw error;
  }
}

export function modelRegistrySnapshot() {
  return JSON.parse(JSON.stringify(BUILTIN_MODELS));
}
