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
 * Converts a numeric privacy score (0-100) to a letter grade (A-F)
 *
 * Grading scale:
 * - A: 90-100 (Excellent privacy practices)
 * - B: 80-89 (Good privacy practices)
 * - C: 70-79 (Fair privacy practices)
 * - D: 60-69 (Poor privacy practices)
 * - F: 0-59 (Bad privacy practices)
 *
 * @param score - Privacy score from 0-100
 * @returns Letter grade (A-F)
 */
export function getLetterGrade(score: number): LetterGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Gets complete grade information including label, emoji, and color styling
 *
 * Color scheme follows Privacy Gecko design system:
 * - A & B: Green (safe, good)
 * - C: Blue (neutral, fair)
 * - D: Amber (caution, poor)
 * - F: Red (danger, bad)
 *
 * @param score - Privacy score from 0-100
 * @returns Complete grade information with styling
 */
export function getGradeInfo(score: number): GradeInfo {
  const grade = getLetterGrade(score);

  switch (grade) {
    case 'A':
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
    case 'B':
      return {
        letter: 'B',
        label: 'Good',
        emoji: '✅',
        colors: {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200'
        }
      };
    case 'C':
      return {
        letter: 'C',
        label: 'Fair',
        emoji: '⚠️',
        colors: {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          border: 'border-blue-300'
        }
      };
    case 'D':
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
    case 'F':
      return {
        letter: 'F',
        label: 'Bad',
        emoji: '❌',
        colors: {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300'
        }
      };
  }
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
