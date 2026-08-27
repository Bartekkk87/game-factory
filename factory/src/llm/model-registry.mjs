// P0 pricing registry. Keep exact model IDs fail-closed: unknown pricing must never
// silently inherit another model's rate. Built-in OpenAI rates were verified
// against the official model documentation on 2026-08-27.
const BUILTIN_MODELS = Object.freeze({
  openai: Object.freeze({
    'gpt-4o': Object.freeze({ inputUsdPerM: 2.5, cachedInputUsdPerM: 1.25, outputUsdPerM: 10 }),
    'gpt-4o-2024-08-06': Object.freeze({ inputUsdPerM: 2.5, cachedInputUsdPerM: 1.25, outputUsdPerM: 10 }),
    'gpt-4o-2024-11-20': Object.freeze({ inputUsdPerM: 2.5, cachedInputUsdPerM: 1.25, outputUsdPerM: 10 }),
    'gpt-4o-mini': Object.freeze({ inputUsdPerM: 0.15, cachedInputUsdPerM: 0.075, outputUsdPerM: 0.6 }),
    'gpt-4o-mini-2024-07-18': Object.freeze({ inputUsdPerM: 0.15, cachedInputUsdPerM: 0.075, outputUsdPerM: 0.6 })
  })
});

export class UnknownModelPricingError extends Error {
  constructor(provider, model, detail = '') {
    super(`No verified pricing for ${provider}:${model}${detail ? ` (${detail})` : ''}`);
    this.name = 'UnknownModelPricingError';
    this.provider = provider;
    this.model = model;
  }
}

function validPricing(value) {
  return value &&
    Number.isFinite(Number(value.inputUsdPerM)) && Number(value.inputUsdPerM) >= 0 &&
    Number.isFinite(Number(value.outputUsdPerM)) && Number(value.outputUsdPerM) >= 0;
}

function configuredPricing() {
  const raw = process.env.GF_MODEL_PRICING_JSON?.trim();
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new UnknownModelPricingError('configured', 'GF_MODEL_PRICING_JSON', `invalid JSON: ${e.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UnknownModelPricingError('configured', 'GF_MODEL_PRICING_JSON', 'expected an object');
  }
  return parsed;
}

export function getModelPricing(provider, model) {
  const key = `${provider}:${model}`;
  const custom = configuredPricing()[key];
  if (custom !== undefined) {
    if (!validPricing(custom)) throw new UnknownModelPricingError(provider, model, 'invalid configured price');
    return {
      inputUsdPerM: Number(custom.inputUsdPerM),
      cachedInputUsdPerM: Number.isFinite(Number(custom.cachedInputUsdPerM))
        ? Number(custom.cachedInputUsdPerM)
        : Number(custom.inputUsdPerM),
      outputUsdPerM: Number(custom.outputUsdPerM),
      source: 'GF_MODEL_PRICING_JSON'
    };
  }

  const builtin = BUILTIN_MODELS[provider]?.[model];
  if (!builtin) throw new UnknownModelPricingError(provider, model);
  return { ...builtin, source: 'builtin-verified-2026-08-27' };
}

export function modelRegistrySnapshot() {
  return JSON.parse(JSON.stringify(BUILTIN_MODELS));
}
