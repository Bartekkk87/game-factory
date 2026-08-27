export function buildOpenAiCompatibleChatRequest({ route, system, user, images = [], json = false, temperature = 0.7, maxTokens = 8192 }) {
  const content = images.length
    ? [{ type: 'text', text: user }, ...images.map((img) => ({ type: 'image_url', image_url: { url: img } }))]
    : user;
  const body = {
    model: route.model.id,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content }
    ]
  };
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
