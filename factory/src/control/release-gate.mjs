export const RELEASE_RULE = 'Technical PASS + Product Fidelity PASS + Experience >= threshold + Budget PASS';

function passValue(value) {
  if (value === true) return true;
  if (!value || typeof value !== 'object') return false;
  return value.pass === true || value.passed === true;
}

export function evaluateReleaseGate({
  technical,
  productFidelity,
  experienceScore,
  budget,
  minExperience = 6.5
}) {
  const score = Number(experienceScore);
  const technicalPass = passValue(technical);
  const productFidelityPass = passValue(productFidelity);
  const experiencePass = Number.isFinite(score) && score >= Number(minExperience);
  const budgetPass = passValue(budget);

  const gates = {
    technical: { pass: technicalPass },
    productFidelity: { pass: productFidelityPass },
    experience: {
      pass: experiencePass,
      score: Number.isFinite(score) ? score : null,
      threshold: Number(minExperience)
    },
    budget: {
      pass: budgetPass,
      spentUsd: Number.isFinite(Number(budget?.spentUsd)) ? Number(budget.spentUsd) : null,
      budgetUsd: Number.isFinite(Number(budget?.budgetUsd)) ? Number(budget.budgetUsd) : null
    }
  };

  const reasons = [];
  if (!technicalPass) reasons.push('technical_not_passed');
  if (!productFidelityPass) reasons.push('product_fidelity_not_passed');
  if (!experiencePass) reasons.push('experience_below_threshold');
  if (!budgetPass) reasons.push('budget_not_passed');

  return {
    schema: 'game-factory.release-gate/v1',
    rule: RELEASE_RULE,
    pass: reasons.length === 0,
    gates,
    reasons
  };
}
