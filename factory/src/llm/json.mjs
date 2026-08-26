export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text];
  for (const raw of candidates) {
    if (!raw) continue;
    let start = -1;
    let open = null;
    for (const c of ['{', '[']) {
      const i = raw.indexOf(c);
      if (i !== -1 && (start === -1 || i < start)) {
        start = i;
        open = c;
      }
    }
    if (start === -1) continue;
    const close = open === '{' ? '}' : ']';
    const end = raw.lastIndexOf(close);
    if (end <= start) continue;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      try {
        return JSON.parse(raw.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
      } catch {}
    }
  }
  throw new Error(`No valid JSON found in LLM response: ${String(text).slice(0, 300)}`);
}
