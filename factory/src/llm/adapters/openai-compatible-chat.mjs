const PROMPT_JSON_GUARD = [
  '=== MACHINE OUTPUT CONTRACT ===',
  'Return exactly one valid JSON object and nothing else.',
  'Do not use markdown fences, prose before/after the object, comments, ellipses, or truncated placeholders.',
  'All strings must be valid JSON strings and the object must be complete before the response ends.',
  'The Factory will parse and deterministically validate the object and will fail closed if it is invalid.'
].join('\n');

function requestShapeFor(route) {
  const shape = route?.model?.requestShape;
  if (!shape || !['max_tokens', 'max_completion_tokens'].includes(shape.tokenParam)) {
    throw new Error(`Model ${route?.model?.id || 'unknown'} has no valid request tokenParam contract`);
  }
  if (!['free', 'unsupported'].includes(shape.temperature)) {
    throw new Error(`Model ${route.model.id} has no valid temperature request contract`);
  }
  if (!['response_format', 'prompt', 'none'].includes(shape.jsonMode)) {
    throw new Error(`Model ${route.model.id} has no valid JSON request contract`);
  }
  if (shape.reasoningEffort != null && !['max', 'xhigh', 'high', 'medium', 'low', 'minimal', 'none'].includes(shape.reasoningEffort)) {
    throw new Error(`Model ${route.model.id} has no valid reasoning effort contract`);
  }
  if (shape.providerSort != null && !['price', 'throughput', 'latency'].includes(shape.providerSort)) {
    throw new Error(`Model ${route.model.id} has no valid OpenRouter provider sort contract`);
  }
  if (shape.requestTimeoutMs != null && (!Number.isInteger(shape.requestTimeoutMs) || shape.requestTimeoutMs < 1)) {
    throw new Error(`Model ${route.model.id} has no valid request timeout contract`);
  }
  return shape;
}

function assertRequestShape({ route, images, json, temperature, maxTokens }) {
  if (!route?.provider?.id || !route?.model?.id) throw new Error('LLM route is incomplete');
  if (!Number.isInteger(maxTokens) || maxTokens < 1) throw new Error(`Invalid maxTokens: ${maxTokens}`);

  const caps = route.model.capabilities ?? {};
  const shape = requestShapeFor(route);
  if (Number.isFinite(caps.maxOutputTokens) && maxTokens > caps.maxOutputTokens) {
    throw new Error(`Requested maxTokens ${maxTokens} exceeds model limit ${caps.maxOutputTokens}`);
  }
  if (images.length && caps.vision !== true) throw new Error(`Model ${route.model.id} does not support vision input`);
  if (json && caps.jsonObject === false) throw new Error(`Model ${route.model.id} does not support JSON-object output`);
  if (json && shape.jsonMode === 'none') throw new Error(`Model ${route.model.id} has no configured JSON output contract`);
  if (shape.reasoningEffort && caps.reasoning !== true) {
    throw new Error(`Model ${route.model.id} has reasoning request tuning but reasoning capability is false`);
  }
  if (shape.providerSort && route.provider.id !== 'openrouter') {
    throw new Error(`Model ${route.model.id} has OpenRouter routing tuning on non-OpenRouter provider ${route.provider.id}`);
  }

  if (shape.temperature === 'free' && temperature != null) {
    const value = Number(temperature);
    if (!Number.isFinite(value) || value < 0 || value > 2) throw new Error(`Invalid temperature: ${temperature}`);
  }

  return shape;
}

export function buildOpenAiCompatibleChatRequest({
  route,
  system,
  user,
  images = [],
  json = false,
  temperature = 0.7,
  maxTokens = 8192
}) {
  const shape = assertRequestShape({ route, images, json, temperature, maxTokens });
  const effectiveSystem = json && shape.jsonMode === 'prompt'
    ? `${system}\n\n${PROMPT_JSON_GUARD}`
    : system;

  const content = images.length
    ? [{ type: 'text', text: user }, ...images.map((img) => ({ type: 'image_url', image_url: { url: img } }))]
    : user;

  const body = {
    model: route.model.id,
    messages: [
      { role: 'system', content: effectiveSystem },
      { role: 'user', content }
    ]
  };

  body[shape.tokenParam] = maxTokens;

  if (shape.temperature === 'free' && temperature != null) {
    body.temperature = Number(temperature);
  }

  if (json && shape.jsonMode === 'response_format') {
    body.response_format = { type: 'json_object' };
  }

  if (shape.reasoningEffort) {
    body.reasoning = {
      effort: shape.reasoningEffort,
      ...(shape.reasoningExclude === true ? { exclude: true } : {})
    };
  }

  if (route.provider.id === 'openrouter' && shape.providerSort) {
    body.provider = {
      sort: shape.providerSort,
      ...(shape.providerRequireParameters === true ? { require_parameters: true } : {})
    };
  }

  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${route.provider.apiKey}`
  };
  if (route.provider.openRouterHeaders) {
    headers['http-referer'] = 'https://github.com/Bartekkk87/game-factory';
    headers['x-title'] = 'Game Factory';
  }

  return {
    url: `${route.provider.baseUrl}${route.provider.chatPath || '/chat/completions'}`,
    headers,
    body: JSON.stringify(body)
  };
}
