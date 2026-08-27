function assertRequestShape({ route, images, json, temperature, maxTokens }) {
  if (!route?.provider?.id || !route?.model?.id) throw new Error('LLM route is incomplete');
  if (!Number.isInteger(maxTokens) || maxTokens < 1) throw new Error(`Invalid maxTokens: ${maxTokens}`);

  const caps = route.model.capabilities ?? {};
  if (Number.isFinite(caps.maxOutputTokens) && maxTokens > caps.maxOutputTokens) {
    throw new Error(`Requested maxTokens ${maxTokens} exceeds model limit ${caps.maxOutputTokens}`);
  }
  if (images.length && caps.vision !== true) throw new Error(`Model ${route.model.id} does not support vision input`);
  if (json && caps.jsonObject === false) throw new Error(`Model ${route.model.id} does not support JSON-object mode`);

  const openAiReasoning = route.provider.id === 'openai' && caps.reasoning === true;
  if (!openAiReasoning && temperature != null) {
    const t = Number(temperature);
    if (!Number.isFinite(t) || t < 0 || t > 2) throw new Error(`Invalid temperature: ${temperature}`);
  }
}

export function buildOpenAiCompatibleChatRequest({ route, system, user, images = [], json = false, temperature = 0.7, maxTokens = 8192 }) {
  assertRequestShape({ route, images, json, temperature, maxTokens });

  const content = images.length
    ? [{ type: 'text', text: user }, ...images.map((img) => ({ type: 'image_url', image_url: { url: img } }))]
    : user;

  const body = {
    model: route.model.id,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content }
    ]
  };

  const openAiReasoning = route.provider.id === 'openai' && route.model.capabilities?.reasoning === true;

  // GPT-5.6 and other OpenAI reasoning models use max_completion_tokens on
  // Chat Completions. Legacy OpenAI and other compatible providers keep
  // max_tokens to avoid changing their established request contract.
  if (openAiReasoning) body.max_completion_tokens = maxTokens;
  else body.max_tokens = maxTokens;

  // OpenAI reasoning models can reject non-default sampling values. The role
  // may still express a temperature preference for providers/models that
  // support it, but it is deliberately omitted for the reasoning route.
  if (!openAiReasoning && temperature != null) body.temperature = Number(temperature);

  if (json) body.response_format = { type: 'json_object' };

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
