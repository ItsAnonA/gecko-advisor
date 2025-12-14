/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import type { Config } from 'tailwindcss';

/**
 * Gecko Advisor Design System (Next.js SSR App)
 *
 * Shared design system with apps/frontend.
 * Focus on SEO-critical pages with minimal JavaScript.
 */
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme
        'light': {
          'bg': '#FAFAF9',
          'surface': '#FFFFFF',
          'elevated': '#F5F5F4',
          'sage': '#F0FDF4',
          'border': '#E7E5E4',
          'hover': '#F5F5F4',
        },
        // Privacy score colors
        'score': {
          'safe': '#34d399',
          'caution': '#fcd34d',
          'danger': '#fca5a5',
        },
        // Privacy Gecko Master Brand
        'privacy-gecko': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Gecko Advisor Product
        'advisor': {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#047857',
          700: '#065f46',
          800: '#064e3b',
          900: '#053524',
        },
        // Trust & Security
        'trust': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Professional Neutral
        'gecko': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Privacy score system
        'privacy': {
          safe: {
            50: '#f0fdf4',
            100: '#dcfce7',
            500: '#16a34a',
            600: '#15803d',
            700: '#166534',
          },
          caution: {
            50: '#fffbeb',
            100: '#fef3c7',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
          },
          danger: {
            50: '#fef2f2',
            100: '#fee2e2',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
          },
        },
        // Legacy aliases
        'security-blue': '#0c5ce6',
        danger: '#ef4444',
        warning: '#f59e0b',
        safe: '#16a34a',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'Space Grotesk', 'DM Sans', 'system-ui', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 10px 24px 0 rgba(0, 0, 0, 0.10)',
      },
      animation: {
        'score-fill': 'score-fill 1.5s ease-out forwards',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'score-fill': {
          '0%': { strokeDashoffset: '251.2' },
          '100%': { strokeDashoffset: 'var(--target-offset)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
