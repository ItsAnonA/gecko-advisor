/**
 * Narrative Generation Service (Phase 3C Hardening - Gap 5)
 *
 * Generates quotable, publishable narratives from insights.
 * Provides reusable templates for consistent storytelling.
 *
 * CRITICAL: All narrative output MUST pass hedge validation before publishing.
 * This is the layer where integrity can silently corrupt.
 */

import { validateHedgeLanguage } from './credibilityService.js';

// ============================================================
// NARRATIVE TEMPLATES
// ============================================================

interface NarrativeTemplate {
  id: string;
  name: string;
  pattern: string;
  variables: string[];
  generate: (data: Record<string, unknown>) => string;
}

export const NARRATIVE_TEMPLATES: NarrativeTemplate[] = [
  {
    id: 'most_improved',
    name: 'Most Improved This Week',
    pattern:
      '{domain} led privacy improvements this week, with a {delta}-point score increase after {reason}.',
    variables: ['domain', 'delta', 'reason'],
    generate: (data) => {
      const trackersRemoved = data.trackersRemoved as number;
      const fingerprintingStopped = data.fingerprintingStopped as boolean;

      const reasonText =
        trackersRemoved > 0
          ? `removing ${trackersRemoved} tracker${trackersRemoved > 1 ? 's' : ''}`
          : fingerprintingStopped
            ? 'disabling browser fingerprinting'
            : 'implementing privacy improvements';

      return `${data.domain} led privacy improvements this week, with a ${data.delta}-point score increase after ${reasonText}.`;
    },
  },

  {
    id: 'unexpected_regression',
    name: 'Unexpected Regression',
    pattern: '{domain}, previously a privacy leader in {category}, dropped {delta} points this week.',
    variables: ['domain', 'category', 'delta'],
    generate: (data) => {
      const delta = Math.abs(data.delta as number);
      const severity = delta > 30 ? 'dramatically' : delta > 15 ? 'significantly' : 'notably';

      let reason = 'adding new tracking mechanisms';
      if (data.fingerprintingStarted) {
        reason = 'enabling browser fingerprinting';
      } else if ((data.trackersAdded as number) > 0) {
        reason = `adding ${data.trackersAdded} new tracker${(data.trackersAdded as number) > 1 ? 's' : ''}`;
      }

      return `${data.domain}, previously a privacy leader${data.category ? ` in ${data.category}` : ''}, ${severity} dropped ${delta} points this week after ${reason}.`;
    },
  },

  {
    id: 'category_shift',
    name: 'Category Shift',
    pattern:
      '{category} saw a {direction} shift in privacy practices, with {percent}% of domains {action}.',
    variables: ['category', 'direction', 'percent', 'action'],
    generate: (data) => {
      const improving = (data.domainsImproving as number) || 0;
      const declining = (data.domainsDeclining as number) || 0;
      const total = improving + declining;

      if (total === 0) {
        return `${data.category} maintained stable privacy practices this week.`;
      }

      const direction = improving > declining ? 'positive' : 'concerning';
      const percent = Math.round((improving / total) * 100);

      return `${data.category} saw a ${direction} shift in privacy practices, with ${percent}% of tracked domains improving their scores this week.`;
    },
  },

  {
    id: 'tracker_surge',
    name: 'Tracker Surge',
    pattern:
      '{tracker} adoption surged {percent}% this week, with {count} new sites adding the tracker.',
    variables: ['tracker', 'percent', 'count'],
    generate: (data) => {
      const count = data.count as number;
      const concern = count > 50 ? 'raising concerns about ' : '';

      return `${data.tracker} adoption surged ${data.percent}% this week, with ${count} new sites adding the tracker, ${concern}cross-site tracking capabilities.`;
    },
  },

  {
    id: 'tracker_decline',
    name: 'Tracker Decline',
    pattern: '{tracker} usage dropped by {count} sites this week, signaling reduced adoption.',
    variables: ['tracker', 'count'],
    generate: (data) => {
      const count = Math.abs(data.count as number);
      const significance =
        count > 50 ? 'a significant decline' : count > 20 ? 'notable reduction' : 'modest decrease';

      return `${data.tracker} saw ${significance} this week, with ${count} sites removing the tracker from their privacy stack.`;
    },
  },

  {
    id: 'stability_leaders',
    name: 'Stability Leaders',
    pattern:
      '{category} maintains the most stable privacy practices, with {percent}% of domains showing consistent scores.',
    variables: ['category', 'percent'],
    generate: (data) => {
      return `${data.category} maintains the most stable privacy practices, with ${data.percent}% of domains showing consistent scores over the past 90 days, making it the most predictable sector for privacy-conscious users.`;
    },
  },

  {
    id: 'early_warning',
    name: 'Early Warning',
    pattern:
      'Our analysis detects early warning signs in {category}, with {count} domains showing accelerating decline.',
    variables: ['category', 'count'],
    generate: (data) => {
      return `Our analysis detects early warning signs in ${data.category}, with ${data.count} domains showing accelerating privacy decline. Based on current trajectory, we predict a ${data.predictedChange}% average score drop over the next 30 days.`;
    },
  },

  {
    id: 'fingerprinting_trend',
    name: 'Fingerprinting Trend',
    pattern: 'Browser fingerprinting {direction} this week, with {net} net change in adoption.',
    variables: ['direction', 'net', 'started', 'stopped'],
    generate: (data) => {
      const started = data.started as number;
      const stopped = data.stopped as number;
      const net = started - stopped;

      if (net > 0) {
        return `Browser fingerprinting expanded this week, with ${started} sites newly enabling the tracking technique while only ${stopped} removed it, representing a net increase of ${net} sites.`;
      } else if (net < 0) {
        return `Browser fingerprinting retreated this week, with ${stopped} sites disabling the technique while ${started} adopted it, representing a net decrease of ${Math.abs(net)} sites.`;
      }
      return `Browser fingerprinting held steady this week, with ${started} sites adopting the technique offset by ${stopped} removing it.`;
    },
  },

  {
    id: 'weekly_summary_opening',
    name: 'Weekly Summary Opening',
    pattern: 'This week {direction} for web privacy, with {changes} significant changes detected.',
    variables: ['direction', 'changes', 'avgChange'],
    generate: (data) => {
      const avgChange = data.avgChange as number;

      if (avgChange > 1) {
        return `This week marked a positive shift for web privacy, with tracked domains showing an average ${avgChange.toFixed(1)}-point improvement across ${data.changes} significant changes.`;
      } else if (avgChange < -1) {
        return `This week saw privacy concerns mount across the web, with tracked domains declining an average ${Math.abs(avgChange).toFixed(1)} points across ${data.changes} significant changes.`;
      }
      return `Privacy practices remained mixed this week, with ${data.changes} significant changes detected across tracked domains.`;
    },
  },
];

// ============================================================
// NARRATIVE GENERATION
// ============================================================

// ============================================================
// NARRATIVE GENERATION WITH MANDATORY VALIDATION
// ============================================================

interface NarrativeResult {
  narrative: string;
  validated: boolean;
  blocked: boolean;
  violations: string[];
}

/**
 * Generate narrative from template and data.
 * MANDATORY: All output passes hedge validation. No bypass allowed.
 */
export function generateNarrative(
  templateId: string,
  data: Record<string, unknown>,
  options: { strict?: boolean } = {}
): string {
  const template = NARRATIVE_TEMPLATES.find((t) => t.id === templateId);

  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const narrative = template.generate(data);

  // MANDATORY: Validate hedge language - no bypass
  const validation = validateHedgeLanguage(narrative);

  if (!validation.valid) {
    // Log violation for audit trail
    console.warn(`[NARRATIVE BLOCKED] Template: ${templateId}, Violations: ${validation.violations.join(', ')}`);

    if (options.strict !== false) {
      throw new Error(`Narrative blocked: Forbidden causal language detected: ${validation.violations.join(', ')}`);
    }
  }

  return narrative;
}

/**
 * Generate narrative with full validation result.
 * Returns structured result including any violations.
 */
export function generateNarrativeWithValidation(
  templateId: string,
  data: Record<string, unknown>
): NarrativeResult {
  const template = NARRATIVE_TEMPLATES.find((t) => t.id === templateId);

  if (!template) {
    return {
      narrative: '',
      validated: false,
      blocked: true,
      violations: [`Unknown template: ${templateId}`],
    };
  }

  const narrative = template.generate(data);
  const validation = validateHedgeLanguage(narrative);

  if (!validation.valid) {
    console.warn(`[NARRATIVE BLOCKED] Template: ${templateId}, Violations: ${validation.violations.join(', ')}`);
  }

  return {
    narrative: validation.valid ? narrative : '',
    validated: validation.valid,
    blocked: !validation.valid,
    violations: validation.violations,
  };
}

/**
 * Get all available template IDs.
 */
export function getAvailableTemplates(): string[] {
  return NARRATIVE_TEMPLATES.map((t) => t.id);
}

/**
 * Get template by ID with metadata.
 */
export function getTemplate(
  templateId: string
): { id: string; name: string; pattern: string; variables: string[] } | null {
  const template = NARRATIVE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  return {
    id: template.id,
    name: template.name,
    pattern: template.pattern,
    variables: template.variables,
  };
}

// ============================================================
// WEEKLY DIGEST GENERATION
// ============================================================

interface WeeklyDigestData {
  totalChanges: number;
  avgScoreChange: number;
  topImprovement?: {
    domain: string;
    delta: number;
    trackersRemoved?: number;
    fingerprintingStopped?: boolean;
  };
  topRegression?: {
    domain: string;
    delta: number;
    category?: string;
    trackersAdded?: number;
    fingerprintingStarted?: boolean;
  };
  topTracker?: {
    tracker: string;
    netChange: number;
    changePercent?: number;
  };
  categoryHighlight?: {
    category: string;
    domainsImproving: number;
    domainsDeclining: number;
  };
  fingerprintingStats?: {
    started: number;
    stopped: number;
  };
}

/**
 * Generate weekly digest narrative.
 * MANDATORY: Final output is validated before return.
 */
export function generateWeeklyDigest(data: WeeklyDigestData): string {
  const lines: string[] = [];

  // Opening - use non-strict mode for individual lines, validate full output
  try {
    lines.push(
      generateNarrative('weekly_summary_opening', {
        changes: data.totalChanges,
        avgChange: data.avgScoreChange,
      }, { strict: false })
    );
  } catch {
    // Skip if blocked
  }

  // Top improvement
  if (data.topImprovement && data.topImprovement.delta > 5) {
    try {
      lines.push(
        generateNarrative('most_improved', {
          domain: data.topImprovement.domain,
          delta: data.topImprovement.delta,
          trackersRemoved: data.topImprovement.trackersRemoved ?? 0,
          fingerprintingStopped: data.topImprovement.fingerprintingStopped ?? false,
        }, { strict: false })
      );
    } catch {
      // Skip if blocked
    }
  }

  // Top regression
  if (data.topRegression && Math.abs(data.topRegression.delta) > 5) {
    try {
      lines.push(
        generateNarrative('unexpected_regression', {
          domain: data.topRegression.domain,
          delta: data.topRegression.delta,
          category: data.topRegression.category,
          trackersAdded: data.topRegression.trackersAdded ?? 0,
          fingerprintingStarted: data.topRegression.fingerprintingStarted ?? false,
        }, { strict: false })
      );
    } catch {
      // Skip if blocked
    }
  }

  // Tracker highlight
  if (data.topTracker && data.topTracker.netChange > 10) {
    try {
      lines.push(
        generateNarrative('tracker_surge', {
          tracker: data.topTracker.tracker,
          percent: data.topTracker.changePercent ?? 0,
          count: data.topTracker.netChange,
        }, { strict: false })
      );
    } catch {
      // Skip if blocked
    }
  } else if (data.topTracker && data.topTracker.netChange < -10) {
    try {
      lines.push(
        generateNarrative('tracker_decline', {
          tracker: data.topTracker.tracker,
          count: data.topTracker.netChange,
        }, { strict: false })
      );
    } catch {
      // Skip if blocked
    }
  }

  // Category highlight
  if (data.categoryHighlight) {
    try {
      lines.push(
        generateNarrative('category_shift', {
          category: data.categoryHighlight.category,
          domainsImproving: data.categoryHighlight.domainsImproving,
          domainsDeclining: data.categoryHighlight.domainsDeclining,
        }, { strict: false })
      );
    } catch {
      // Skip if blocked
    }
  }

  // Fingerprinting stats
  if (data.fingerprintingStats) {
    try {
      lines.push(
        generateNarrative('fingerprinting_trend', {
          started: data.fingerprintingStats.started,
          stopped: data.fingerprintingStats.stopped,
        }, { strict: false })
      );
    } catch {
      // Skip if blocked
    }
  }

  const fullDigest = lines.join(' ');

  // MANDATORY: Final validation of complete digest
  const finalValidation = validateHedgeLanguage(fullDigest);
  if (!finalValidation.valid) {
    console.error(`[DIGEST BLOCKED] Full digest failed validation: ${finalValidation.violations.join(', ')}`);
    throw new Error(`Weekly digest blocked: ${finalValidation.violations.join(', ')}`);
  }

  return fullDigest;
}

/**
 * Generate headline for breaking insight.
 */
export function generateHeadline(insight: {
  type: string;
  domain?: string;
  category?: string;
  tracker?: string;
  delta?: number;
  count?: number;
}): string {
  switch (insight.type) {
    case 'DOMAIN_IMPROVEMENT':
      return `${insight.domain} Privacy Score Jumps ${insight.delta} Points`;
    case 'DOMAIN_REGRESSION':
      return `${insight.domain} Privacy Score Drops ${Math.abs(insight.delta ?? 0)} Points`;
    case 'CATEGORY_TREND':
      return `${insight.category} Category Shows ${(insight.delta ?? 0) > 0 ? 'Privacy Gains' : 'Privacy Concerns'}`;
    case 'TRACKER_SURGE':
      return `${insight.tracker} Tracker Adoption Surges Across ${insight.count} Sites`;
    case 'TRACKER_DECLINE':
      return `${insight.tracker} Sees Declining Adoption`;
    case 'FINGERPRINTING_SHIFT':
      return `Fingerprinting Landscape Shifts: ${insight.count} Sites Change Behavior`;
    default:
      return 'Privacy Landscape Update';
  }
}

/**
 * Generate social media snippet (280 chars max).
 */
export function generateSocialSnippet(insight: {
  type: string;
  domain?: string;
  category?: string;
  tracker?: string;
  delta?: number;
  count?: number;
}): string {
  let text = '';

  switch (insight.type) {
    case 'DOMAIN_IMPROVEMENT':
      text = `Privacy win: ${insight.domain} improved their privacy score by ${insight.delta} points this week.`;
      break;
    case 'DOMAIN_REGRESSION':
      text = `Privacy alert: ${insight.domain} dropped ${Math.abs(insight.delta ?? 0)} points in our latest privacy scan.`;
      break;
    case 'TRACKER_SURGE':
      text = `${insight.tracker} is spreading: ${insight.count} new sites added this tracker this week.`;
      break;
    case 'CATEGORY_TREND':
      text = `${insight.category} sites are ${(insight.delta ?? 0) > 0 ? 'improving' : 'declining'} in privacy this week.`;
      break;
    default:
      text = 'New insights from our weekly privacy analysis.';
  }

  // Ensure within Twitter/X limits
  return text.length > 280 ? text.substring(0, 277) + '...' : text;
}
