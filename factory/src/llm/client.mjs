import { LLM } from '../config.mjs';
import { log } from '../util/log.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class LlmError extends Error {}

let totalCostUsd = 0;
let totalTokens = 0;

export function costReport() {
  return { costUsd: Math.round(totalCostUsd * 10000) / 10000, tokens: totalTokens };
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

  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${LLM.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${LLM.apiKey}`,
          'content-type': 'application/json',
          'http-referer': 'https://github.com/game-factory',
          'x-title': 'Game Factory'
        },
        body: JSON.stringify(body)
      });
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
      log.info(`[llm:${role}] model=${model} tokens=${usage.total_tokens ?? '?'}`);
      return { text: msg, usage, model };
    } catch (e) {
      lastErr = e;
      if (e.fatal) throw e;
      log.warn(`[llm:${role}] attempt ${attempt} failed: ${e.message}`);
      if (attempt < 4) await sleep(1200 * attempt * attempt);
    }
  }
  throw lastErr;
}
