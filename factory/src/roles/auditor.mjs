import { chat } from '../llm/client.mjs';
import { extractJson } from '../llm/json.mjs';
import { loadPrompt } from '../util/skills.mjs';
import { LIMITS } from '../config.mjs';

const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export async function runAuditor({ digest }) {
  const system = loadPrompt('auditor');
  const { text } = await chat({
    role: 'auditor',
    system,
    user: JSON.stringify(digest, null, 2),
    json: true,
    temperature: 0.2,
    maxTokens: LIMITS.auditorMaxTokens
  });
  const audit = extractJson(text);
  if (!['CONSISTENT', 'CONCERNS'].includes(audit.assessment)) {
    throw new Error('auditor returned invalid advisory assessment');
  }
  audit.findings = Array.isArray(audit.findings) ? audit.findings : [];
  for (const finding of audit.findings) {
    if (!SEVERITIES.has(finding?.severity) || typeof finding?.note !== 'string') {
      throw new Error('auditor returned invalid finding');
    }
  }
  if (typeof audit.summary !== 'string' || !audit.summary.trim()) {
    throw new Error('auditor returned missing summary');
  }
  if ('verdict' in audit) delete audit.verdict;
  return audit;
}
