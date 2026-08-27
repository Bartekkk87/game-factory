import { LLM } from '../config.mjs';
import { log } from '../util/log.mjs';
import {
  beginRunBudget,
  BudgetError,
  costReport,
  openLogicalCall,
  releaseAttempt,
  reserveAttempt,
  settleAttempt,
  settleUncertainAttempt
} from '../control/budget.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class LlmError extends Error {}
export { beginRunBudget, costReport };

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

  switch (LLM.provider) {
    case 'openrouter':
      headers['authorization'] = `Bearer ${LLM.apiKey}`;
      headers['http-referer'] = 'https://github.com/game-factory';
      headers['x-title'] = 'Game Factory';
      break;
    case 'googleai':
    case 'huggingface':
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
  operation = role,
  system,
  user,
  images = [],
  json = false,
  temperature = 0.7,
  maxTokens = 8192
}) {
  if (!LLM.apiKey) throw new LlmError('GF_LLM_API_KEY is not set');
  const model = LLM.models[role] || LLM.defaultModel;
  const logical = openLogicalCall({
    role,
    operation,
    provider: LLM.provider,
    model,
    system,
    user,
    images
  });

  let lastErr;
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    let reservationId = null;
    let reservationClosed = false;
    try {
      // Hard financial gate BEFORE every request, including transport retries.
      reservationId = reserveAttempt(logical, { transportAttempt: attempt, maxTokens });
      const { url, headers, body } = buildRequest({ model, system, user, images, json, temperature, maxTokens });
      const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
      if (!res.ok) {
        const t = await res.text();
        releaseAttempt(reservationId, { status: `http-${res.status}`, error: t });
        reservationClosed = true;
        const err = new LlmError(`HTTP ${res.status}: ${t.slice(0, 400)}`);
        if (res.status === 429 || res.status >= 500) throw err;
        throw Object.assign(err, { fatal: true });
      }

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new LlmError(`Invalid JSON response: ${e.message}`);
      }
      const usage = data.usage ?? {};
      const settled = settleAttempt(reservationId, { usage, providerCostUsd: usage.cost });
      reservationClosed = true;
      const msg = data.choices?.[0]?.message?.content ?? '';
      if (!msg.trim()) throw new LlmError('Empty completion');
      log.info(`[llm:${role}/${operation}] provider=${LLM.provider} model=${model} tokens=${usage.total_tokens ?? '?'} cost=$${settled.costUsd.toFixed(6)}`);
      return { text: msg, usage, model, costUsd: settled.costUsd };
    } catch (e) {
      lastErr = e;
      if (reservationId && !reservationClosed) {
        // A transport/parse failure after request dispatch can have uncertain billing.
        // Charge the conservative reservation and stop: never blindly repeat spend.
        settleUncertainAttempt(reservationId, e);
        reservationClosed = true;
        e.fatal = true;
      }
      if (e instanceof BudgetError || e.fatal) throw e;
      log.warn(`[llm:${role}/${operation}] attempt ${attempt}/${maxAttempts} failed: ${e.message}`);
      if (attempt < maxAttempts) {
        // Retry only requests with a received 429/5xx response whose reservation
        // was explicitly released. Ambiguous transport failures fail closed above.
        const wait = e.message.includes('503') || e.message.includes('429') ? 10000 * attempt : 1200 * attempt * attempt;
        log.warn(`[llm:${role}/${operation}] retrying in ${Math.round(wait / 1000)}s ...`);
        await sleep(wait);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastErr;
}
