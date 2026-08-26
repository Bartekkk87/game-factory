import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt } from '../util/skills.mjs';

export async function runAuditor({ digest }) {
  const system = loadPrompt('auditor');
  const { text } = await chat({
    role: 'auditor',
    system,
    user: JSON.stringify(digest, null, 2),
    json: true,
    temperature: 0.2
  });
  const audit = extractJson(text);
  if (!['PASS', 'FAIL'].includes(audit.verdict)) throw new Error('auditor returned invalid verdict');
  return audit;
}
