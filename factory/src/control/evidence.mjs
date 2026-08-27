export const RUN_EVIDENCE_SCHEMA = 'game-factory.run-evidence/v1';

export function validateRunEvidence(evidence) {
  const problems = [];
  if (evidence?.schema !== RUN_EVIDENCE_SCHEMA) problems.push('schema');
  if (!evidence?.run?.id) problems.push('run.id');
  if (!evidence?.run?.status) problems.push('run.status');
  for (const gate of ['technical', 'productFidelity', 'experience', 'budget', 'release']) {
    if (typeof evidence?.gates?.[gate]?.pass !== 'boolean') problems.push(`gates.${gate}.pass`);
  }
  if (evidence?.costs?.schema !== 'game-factory.cost-ledger/v1') problems.push('costs.schema');
  if (!Array.isArray(evidence?.costs?.attempts)) problems.push('costs.attempts');
  if (problems.length) throw new Error(`Invalid run evidence: ${problems.join(', ')}`);
  return evidence;
}

export function createRunEvidence({
  runId,
  status,
  reason = null,
  source = 'unknown',
  candidateSha = null,
  technical = null,
  productFidelity = null,
  experience = null,
  budget,
  releaseGate,
  audit = null,
  counters = {},
  artifacts = {}
}) {
  const evidence = {
    schema: RUN_EVIDENCE_SCHEMA,
    generatedAt: new Date().toISOString(),
    run: {
      id: runId,
      status,
      reason,
      source,
      candidateSha
    },
    gates: {
      technical: {
        pass: releaseGate.gates.technical.pass,
        checks: technical?.checks ?? null
      },
      productFidelity: {
        pass: releaseGate.gates.productFidelity.pass,
        status: productFidelity?.status ?? null,
        criteria: productFidelity?.criteria ?? null
      },
      experience: {
        ...releaseGate.gates.experience,
        scores: experience?.scores ?? null,
        critique: experience?.critique ?? []
      },
      budget: releaseGate.gates.budget,
      release: {
        pass: releaseGate.pass,
        rule: releaseGate.rule,
        reasons: releaseGate.reasons
      }
    },
    costs: budget,
    counters,
    audit: audit ? { advisory: true, ...audit } : null,
    artifacts
  };
  return validateRunEvidence(evidence);
}
