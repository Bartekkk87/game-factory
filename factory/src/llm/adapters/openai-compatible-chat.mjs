function requestShapeFor(route) {
  const shape = route?.model?.requestShape;
  if (!shape || !['max_tokens', 'max_completion_tokens'].includes(shape.tokenParam)) {
    throw new Error(`Model ${route?.model?.id || 'unknown'} has no valid request tokenParam contract`);
  }
  if (!['free', 'unsupported'].includes(shape.temperature)) {
    throw new Error(`Model ${route.model.id} has no valid temperature request contract`);
  }
  if (!['response_format', 'none'].includes(shape.jsonMode)) {
    throw new Error(`Model ${route.model.id} has no valid JSON request contract`);
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
  if (json && caps.jsonObject === false) throw new Error(`Model ${route.model.id} does not support JSON-object mode`);
  if (json && shape.jsonMode === 'none') throw new Error(`Model ${route.model.id} has no configured JSON request mode`);

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

  body[shape.tokenParam] = maxTokens;

  if (shape.temperature === 'free' && temperature != null) {
    body.temperature = Number(temperature);
  }

  if (json && shape.jsonMode === 'response_format') {
    body.response_format = { type: 'json_object' };
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
