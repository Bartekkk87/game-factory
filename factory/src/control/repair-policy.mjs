function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

export function runtimeErrors(bundle = {}) {
  return uniqueStrings([
    ...(bundle.consoleErrors || []),
    ...(bundle.pageErrors || []),
    ...(bundle.probeErrors || [])
  ]);
}

export function evaluateRepairProgress({ currentBundle, bestBundle = null } = {}) {
  if (!currentBundle) throw new Error('currentBundle is required');

  const currentFailures = Array.isArray(currentBundle.failures) ? currentBundle.failures.length : 0;
  const currentRuntimeErrors = runtimeErrors(currentBundle);

  if (!bestBundle) {
    return {
      acceptAsBest: true,
      improved: true,
      regressed: false,
      reason: 'initial-failed-candidate',
      currentFailures,
      bestFailures: null,
      failureDelta: null,
      currentRuntimeErrors,
      bestRuntimeErrors: [],
      newRuntimeErrors: []
    };
  }

  const bestFailures = Array.isArray(bestBundle.failures) ? bestBundle.failures.length : 0;
  const bestRuntimeErrors = runtimeErrors(bestBundle);
  const bestErrorSet = new Set(bestRuntimeErrors);
  const currentErrorSet = new Set(currentRuntimeErrors);
  const newRuntimeErrors = currentRuntimeErrors.filter((error) => !bestErrorSet.has(error));
  const removedRuntimeErrors = bestRuntimeErrors.filter((error) => !currentErrorSet.has(error));
  const failureDelta = currentFailures - bestFailures;

  const regressed = failureDelta > 0 || newRuntimeErrors.length > 0;
  const improved = !regressed && (
    failureDelta < 0 ||
    (failureDelta === 0 && removedRuntimeErrors.length > 0)
  );

  return {
    acceptAsBest: improved,
    improved,
    regressed,
    reason: regressed
      ? newRuntimeErrors.length
        ? 'new-runtime-error'
        : 'more-failed-checks'
      : improved
        ? failureDelta < 0
          ? 'fewer-failed-checks'
          : 'fewer-runtime-errors'
        : 'no-material-improvement',
    currentFailures,
    bestFailures,
    failureDelta,
    currentRuntimeErrors,
    bestRuntimeErrors,
    newRuntimeErrors
  };
}

export function retainBestFailed({ best = null, current } = {}) {
  if (!current?.bundle || !current?.design || !current?.tech) {
    throw new Error('current failed candidate requires bundle, design and tech');
  }
  const evaluation = evaluateRepairProgress({
    currentBundle: current.bundle,
    bestBundle: best?.bundle || null
  });
  return {
    best: evaluation.acceptAsBest ? current : best,
    evaluation
  };
}
