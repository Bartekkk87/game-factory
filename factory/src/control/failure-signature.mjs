function normalizedDiagnosticClass(value) {
  let text = String(value ?? '').trim();
  if (!text) return null;

  text = text.split('\n')[0]
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/(?:[A-Za-z]:)?[\\/](?:[^\s:]+[\\/])+[^\s:]*/g, '<path>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')
    .replace(/:\d+:\d+/g, ':<loc>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return text.slice(0, 240) || null;
}

function stableUnique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function semanticFailureSignature(bundle = {}) {
  const failures = stableUnique((bundle.failures || []).map((failure) => {
    const gate = String(failure?.gate || 'unknown');
    const id = String(failure?.id || 'unknown');
    return `${gate}:${id}`;
  }));

  const diagnostics = stableUnique([
    ...(bundle.consoleErrors || []).map((value) => `console:${normalizedDiagnosticClass(value)}`),
    ...(bundle.pageErrors || []).map((value) => `page:${normalizedDiagnosticClass(value)}`),
    ...(bundle.probeErrors || []).map((value) => `probe:${normalizedDiagnosticClass(value)}`)
  ]);

  return JSON.stringify({ failures, diagnostics });
}

export const __test = Object.freeze({ normalizedDiagnosticClass });
