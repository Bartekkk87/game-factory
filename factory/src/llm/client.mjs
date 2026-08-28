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
import { resolveRoleRoute } from './router.mjs';
import { buildOpenAiCompatibleChatRequest } from './adapters/openai-compatible-chat.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DEFINITELY_PRE_DELIVERY_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
]);

export class LlmError extends Error {}
export { beginRunBudget, costReport };

function transportCode(error) {
  return String(error?.cause?.code || error?.code || '').trim().toUpperCase();
}

export function isDefinitelyPreDeliveryTransportError(error) {
  if (!error || error.name === 'AbortError') return false;
  return DEFINITELY_PRE_DELIVERY_CODES.has(transportCode(error));
}

export async function chat({
  role = 'engineer',
  operation = role,
  credentialLane = null,
  system,
  user,
  images = [],
  json = false,
  temperature = 0.7,
  maxTokens = 8192
}) {
  const route = resolveRoleRoute({
    role,
    operation,
    credentialLane,
    requirements: {
      vision: images.length > 0,
      jsonObject: json,
      maxOutputTokens: maxTokens
    }
  });

  if (!route.provider.apiKey) {
    throw Object.assign(
      new LlmError(`API key is not configured for provider ${route.provider.id} credential lane ${route.credentialLane}`),
      { fatal: true }
    );
  }

  const logical = openLogicalCall({
    role,
    operation,
    provider: route.provider.id,
    model: route.model.id,
    requestedProvider: route.provider.id,
    requestedModel: route.model.id,
    credentialLane: route.credentialLane,
    modelVersion: route.model.versionLabel,
    modelAliasKind: route.model.aliasKind,
    adapter: route.provider.adapter,
    system,
    user,
    images
  });

  let lastError;
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    let reservationId = null;
    let reservationClosed = false;

    try {
      reservationId = reserveAttempt(logical, { transportAttempt: attempt, maxTokens });
      const request = buildOpenAiCompatibleChatRequest({ route, system, user, images, json, temperature, maxTokens });
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: controller.signal
      });

      if (!response.ok) {
        const text = await response.text();
        releaseAttempt(reservationId, { status: `http-${response.status}`, error: text });
        reservationClosed = true;
        const error = new LlmError(`HTTP ${response.status}: ${text.slice(0, 400)}`);
        if (response.status === 429 || response.status >= 500) throw error;
        throw Object.assign(error, { fatal: true });
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new LlmError(`Invalid JSON response: ${error.message}`);
      }

      const usage = data.usage ?? {};
      const settled = settleAttempt(reservationId, {
        usage,
        providerCostUsd: usage.cost,
        responseModelId: data.model ?? null
      });
      reservationClosed = true;

      const message = data.choices?.[0]?.message?.content ?? '';
      if (!message.trim()) throw new LlmError('Empty completion');

      const actualModel = settled.responseModelId || data.model || route.model.id;
      log.info(
        `[llm:${role}/${operation}] provider=${route.provider.id} model=${route.model.id} lane=${route.credentialLane} `
        + `actual=${actualModel} tokens=${usage.total_tokens ?? '?'} cost=$${settled.costUsd.toFixed(6)}`
      );
      return {
        text: message,
        usage,
        role,
        operation,
        requestedProvider: route.provider.id,
        requestedModel: route.model.id,
        provider: route.provider.id,
        model: route.model.id,
        actualModel,
        credentialLane: route.credentialLane,
        modelVersion: actualModel || route.model.versionLabel,
        costUsd: settled.costUsd
      };
    } catch (error) {
      lastError = error;

      if (reservationId && !reservationClosed) {
        if (isDefinitelyPreDeliveryTransportError(error)) {
          releaseAttempt(reservationId, {
            status: 'transport-pre-delivery',
            error: error?.message || error
          });
          reservationClosed = true;
        } else {
          settleUncertainAttempt(reservationId, error);
          reservationClosed = true;
          error.fatal = true;
        }
      }

      if (error instanceof BudgetError || error.fatal) throw error;
      log.warn(`[llm:${role}/${operation}] attempt ${attempt}/${maxAttempts} failed: ${error.message}`);

      if (attempt < maxAttempts) {
        const wait = error.message.includes('503') || error.message.includes('429')
          ? 10000 * attempt
          : 1200 * attempt * attempt;
        log.warn(`[llm:${role}/${operation}] retrying in ${Math.round(wait / 1000)}s ...`);
        await sleep(wait);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
