/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Letter Grading System for Privacy Scores
 *
 * Provides universally-recognized A-F letter grades to reduce cognitive load
 * and improve user comprehension of privacy scores.
 *
 * @module grading
 */

export type LetterGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Complete information about a letter grade including visual styling
 */
export interface GradeInfo {
  /** Letter grade (A-F) */
  letter: LetterGrade;
  /** Human-friendly label (Excellent, Good, Fair, Poor, Bad) */
  label: string;
  /** Visual emoji indicator */
  emoji: string;
  /** Tailwind CSS color classes */
  colors: {
    /** Background color class (e.g., bg-green-100) */
    bg: string;
    /** Text color class (e.g., text-green-800) */
    text: string;
    /** Border color class (e.g., border-green-200) */
    border: string;
  };
}

/**
 * Score thresholds aligned with privacy risk labels
 *
 * These thresholds ensure grade letters align with risk labels:
 * - Low Privacy Risk (80-100): A+ or A
 * - Moderate Privacy Risk (60-79): B or C
 * - High Privacy Risk (40-59): D
 * - Critical Privacy Risk (0-39): F
 */
export const SCORE_THRESHOLDS = {
  LOW_RISK: 80,      // 80-100 → Low Privacy Risk
  MODERATE_RISK: 60, // 60-79  → Moderate Privacy Risk
  HIGH_RISK: 40,     // 40-59  → High Privacy Risk
  CRITICAL_RISK: 0   // 0-39   → Critical Privacy Risk
} as const;

/**
 * Converts a numeric privacy score (0-100) to a letter grade (A-F)
 *
 * Grading scale (aligned with risk labels):
 * - A: 90-100 (Excellent - Low Privacy Risk)
 * - A: 80-89 (Good - Low Privacy Risk)
 * - B: 70-79 (Fair - Moderate Privacy Risk)
 * - C: 60-69 (Moderate - Moderate Privacy Risk)
 * - D: 40-59 (Poor - High Privacy Risk)
 * - F: 0-39 (Critical - Critical Privacy Risk)
 *
 * @param score - Privacy score from 0-100
 * @returns Letter grade (A-F)
 */
export function getLetterGrade(score: number): LetterGrade {
  if (score >= 90) return 'A';
  if (score >= SCORE_THRESHOLDS.LOW_RISK) return 'A'; // 80-89
  if (score >= 70) return 'B';                         // 70-79
  if (score >= SCORE_THRESHOLDS.MODERATE_RISK) return 'C'; // 60-69
  if (score >= SCORE_THRESHOLDS.HIGH_RISK) return 'D'; // 40-59
  return 'F'; // 0-39
}

/**
 * Gets complete grade information including label, emoji, and color styling
 *
 * Color scheme follows Privacy Gecko design system (aligned with risk labels):
 * - A (90-100): Excellent - Low Privacy Risk (bright green)
 * - A (80-89): Good - Low Privacy Risk (green)
 * - B (70-79): Fair - Moderate Privacy Risk (light green/blue)
 * - C (60-69): Moderate - Moderate Privacy Risk (blue)
 * - D (40-59): Poor - High Privacy Risk (amber)
 * - F (0-39): Critical - Critical Privacy Risk (red)
 *
 * @param score - Privacy score from 0-100
 * @returns Complete grade information with styling
 */
export function getGradeInfo(score: number): GradeInfo {
  // Use score directly for more granular labeling within grade A
  if (score >= 90) {
    return {
      letter: 'A',
      label: 'Excellent',
      emoji: '🎉',
      colors: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300'
      }
    };
  }

  if (score >= SCORE_THRESHOLDS.LOW_RISK) { // 80-89
    return {
      letter: 'A',
      label: 'Good',
      emoji: '✅',
      colors: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200'
      }
    };
  }

  if (score >= 70) { // 70-79
    return {
      letter: 'B',
      label: 'Fair',
      emoji: '👍',
      colors: {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200'
      }
    };
  }

  if (score >= SCORE_THRESHOLDS.MODERATE_RISK) { // 60-69
    return {
      letter: 'C',
      label: 'Moderate',
      emoji: '⚠️',
      colors: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300'
      }
    };
  }

  if (score >= SCORE_THRESHOLDS.HIGH_RISK) { // 40-59
    return {
      letter: 'D',
      label: 'Poor',
      emoji: '⚠️',
      colors: {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300'
      }
    };
  }

  // 0-39
  return {
    letter: 'F',
    label: 'Critical',
    emoji: '❌',
    colors: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300'
    }
  };
}

/**
 * Generates a screen reader-friendly description of the grade
 *
 * Creates an accessible ARIA label that provides full context:
 * "Grade {letter}: {label} privacy score, {score} out of 100"
 *
 * @param score - Privacy score from 0-100
 * @returns Accessible description string for aria-label
 */
export function getGradeAriaLabel(score: number): string {
  const info = getGradeInfo(score);
  return `Grade ${info.letter}: ${info.label} privacy score, ${score} out of 100`;
}
