/**
 * Editorial Language - Accuracy Formatting
 *
 * Phase 0: No Wilson CI. No charts. No curve talk.
 *
 * Rules:
 * - accuracy === null -> "Predictive accuracy currently unknown."
 * - n < 50           -> "Validated predictions: {n}. Statistical confidence limited."
 * - n >= 50          -> "{accuracy}% (n={n})"
 */

/**
 * Format overall accuracy for display.
 */
export function formatAccuracy(
  accuracy: number | null,
  validated: number,
): string {
  if (accuracy === null) {
    return 'Predictive accuracy currently unknown.';
  }
  if (validated < 50) {
    return `Validated predictions: ${validated}. Statistical confidence limited.`;
  }
  return `${accuracy}% (n=${validated})`;
}

/**
 * Format per-subtype accuracy for display.
 */
export function formatSubtypeAccuracy(
  accuracy: number | null,
  validated: number,
): string {
  if (accuracy === null) {
    return 'Not yet measurable';
  }
  if (validated < 20) {
    return `${validated} validated — insufficient for accuracy`;
  }
  return `${accuracy}% (n=${validated})`;
}

/**
 * Get rolling accuracy description for the accuracy page placeholder.
 */
export function getRollingAccuracyDescription(validated: number): string {
  if (validated === 0) {
    return 'Rolling 90-day accuracy: Insufficient validated predictions.';
  }
  if (validated < 50) {
    return `Rolling 90-day accuracy: ${validated} predictions validated. Minimum 50 required for statistical reporting.`;
  }
  return 'Rolling 90-day accuracy available.';
}
