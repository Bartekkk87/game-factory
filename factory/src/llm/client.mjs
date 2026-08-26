import { LLM } from '../config.mjs';
import { log } from '../util/log.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class LlmError extends Error {}

let totalCostUsd = 0;
let totalTokens = 0;

export function costReport() {
  return { costUsd: Math.round(totalCostUsd * 10000) / 10000, tokens: totalTokens };
}

// Provider-specific request builders. All return {url, headers, body}.
// Each provider speaks the OpenAI /chat/completions schema (Google AI Studio
// exposes an OpenAI-compatible endpoint, HF Router is OpenAI-compatible too).
function buildRequest({ model, system, user, images, json, temperature, maxTokens }) {
  const content = [{ type: 'text', text: user }];
  for (const img of images) {
    content.push({ type: 'image_url', image_url: { url: img } });
  }
  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content }
    ]
  };
  if (json) body.response_format = { type: 'json_object' };

  const headers = {
    'content-type': 'application/json'
  };

  // Provider-specific auth + optional extra headers
  switch (LLM.provider) {
    case 'openrouter':
      headers['authorization'] = `Bearer ${LLM.apiKey}`;
      headers['http-referer'] = 'https://github.com/game-factory';
      headers['x-title'] = 'Game Factory';
      break;
    case 'googleai':
      // Google AI Studio OpenAI-compat endpoint accepts the key as Bearer token
      headers['authorization'] = `Bearer ${LLM.apiKey}`;
      break;
    case 'huggingface':
      headers['authorization'] = `Bearer ${LLM.apiKey}`;
      break;
    case 'openai':
    default:
      headers['authorization'] = `Bearer ${LLM.apiKey}`;
      break;
  }

  return {
    url: `${LLM.baseUrl}/chat/completions`,
    headers,
    body: JSON.stringify(body)
  };
}

export async function chat({
  role = 'engineer',
  system,
  user,
  images = [],
  json = false,
  temperature = 0.7,
  maxTokens = 8192
}) {
  if (!LLM.apiKey) throw new LlmError('GF_LLM_API_KEY is not set');
  const model = LLM.models[role] || LLM.defaultModel;

  let lastErr;
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const { url, headers, body } = buildRequest({ model, system, user, images, json, temperature, maxTokens });
      const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      if (!res.ok) {
        const t = await res.text();
        const err = new LlmError(`HTTP ${res.status}: ${t.slice(0, 400)}`);
        if (res.status === 429 || res.status >= 500) throw err;
        throw Object.assign(err, { fatal: true });
      }
      const data = await res.json();
      const usage = data.usage ?? {};
      totalTokens += usage.total_tokens ?? 0;
      if (typeof usage.cost === 'number') totalCostUsd += usage.cost;
      const msg = data.choices?.[0]?.message?.content ?? '';
      if (!msg.trim()) throw new LlmError('Empty completion');
      log.info(`[llm:${role}] provider=${LLM.provider} model=${model} tokens=${usage.total_tokens ?? '?'}`);
      return { text: msg, usage, model };
    } catch (e) {
      lastErr = e;
      if (e.fatal) throw e;
      log.warn(`[llm:${role}] attempt ${attempt}/${maxAttempts} failed: ${e.message}`);
      if (attempt < maxAttempts) {
        // Longer backoff for rate limits / overload (503/429): 10s, 20s, 30s...
        const wait = e.message.includes('503') || e.message.includes('429') ? 10000 * attempt : 1200 * attempt * attempt;
        log.warn(`[llm:${role}] retrying in ${Math.round(wait / 1000)}s ...`);
        await sleep(wait);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastErr;
}
