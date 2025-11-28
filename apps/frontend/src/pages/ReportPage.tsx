/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { reportQueryOptions } from '../lib/api';
import EnhancedScoreDial from '../components/EnhancedScoreDial';
import Card from '../components/Card';
import CopyButton from '../components/CopyButton';
import InfoPopover from '../components/InfoPopover';
import VirtualizedEvidenceList from '../components/VirtualizedEvidenceList';
import { ScoreDialSkeleton, CardSkeleton, EvidenceCardSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorBoundary';
import Footer from '../components/Footer';
import Header from '../components/Header';
import GradeBadge from '../components/GradeBadge';
import BackToHome from '../components/BackToHome';
import type { ReportResponse } from '@gecko-advisor/shared';
import { computeDataSharingLevel, type DataSharingLevel } from '../lib/dataSharing';

type EvidenceItem = ReportResponse['evidence'][number];
type EvidenceType = EvidenceItem['kind'];
type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

/**
 * Enhanced evidence categorization for better information architecture
 */
interface EvidenceCategory {
  title: string;
  icon: string;
  items: EvidenceItem[];
  description: string;
  color: {
    bg: string;
    border: string;
    iconBg: string;
    text: string;
    accent: string;
  };
}

/**
 * Categorizes evidence into semantic groups for better UX
 * Each category has distinct visual styling for clarity
 */
function categorizeEvidence(evidence: EvidenceItem[]): Record<string, EvidenceCategory> {
  const categories: Record<string, EvidenceCategory> = {
    tracking: {
      title: 'Tracking & Privacy',
      icon: '🎯',
      items: [],
      description: 'Data collection, tracking, and privacy concerns',
      color: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        iconBg: 'bg-purple-100',
        text: 'text-purple-800',
        accent: 'text-purple-600'
      }
    },
    security: {
      title: 'Security',
      icon: '🔒',
      items: [],
      description: 'Security headers, encryption, and vulnerabilities',
      color: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        text: 'text-blue-800',
        accent: 'text-blue-600'
      }
    },
    other: {
      title: 'Other Findings',
      icon: '📋',
      items: [],
      description: 'Additional issues and recommendations',
      color: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        iconBg: 'bg-gray-100',
        text: 'text-gray-800',
        accent: 'text-gray-600'
      }
    }
  };

  evidence.forEach(item => {
    const lowerTitle = item.title?.toLowerCase() || '';
    const lowerType = item.kind?.toLowerCase() || '';

    // Tracking & Privacy category
    if (
      lowerType === 'tracker' ||
      lowerType === 'cookie' ||
      lowerType === 'thirdparty' ||
      lowerType === 'fingerprint' ||
      lowerType === 'policy' ||
      lowerTitle.includes('tracker') ||
      lowerTitle.includes('cookie') ||
      lowerTitle.includes('third-party') ||
      lowerTitle.includes('data sharing') ||
      lowerTitle.includes('fingerprint')
    ) {
      if (categories.tracking) categories.tracking.items.push(item);
    }
    // Security category
    else if (
      lowerType === 'tls' ||
      lowerType === 'header' ||
      lowerType === 'insecure' ||
      lowerType === 'mixed-content' ||
      lowerTitle.includes('tls') ||
      lowerTitle.includes('https') ||
      lowerTitle.includes('security') ||
      lowerTitle.includes('header') ||
      lowerTitle.includes('mixed content') ||
      lowerTitle.includes('encryption')
    ) {
      if (categories.security) categories.security.items.push(item);
    }
    // Other
    else {
      if (categories.other) categories.other.items.push(item);
    }
  });

  return categories;
}

/**
 * Calculates severity distribution for a category
 */
function getCategorySeverityStats(items: EvidenceItem[]) {
  const critical = items.filter(i => i.severity >= 4).length;
  const high = items.filter(i => i.severity === 3).length;
  const medium = items.filter(i => i.severity === 2).length;
  const low = items.filter(i => i.severity <= 1).length;
  const maxSeverity = Math.max(...items.map(i => i.severity), 0);
  return { critical, high, medium, low, maxSeverity, total: items.length };
}

/**
 * Maps evidence type to human-readable category label
 */
const getCategoryLabel = (type: string | undefined): string => {
  if (!type || type === 'undefined' || type === 'unknown') return 'Security & Privacy';

  const labels: Record<string, string> = {
    'tracker': 'Tracking & Analytics',
    'thirdparty': 'Third-Party Connections',
    'cookie': 'Cookies & Storage',
    'header': 'Security Headers',
    'insecure': 'Security Issues',
    'fingerprint': 'Fingerprinting',
    'policy': 'Privacy Policy',
    'tls': 'Encryption & TLS',
    'mixed-content': 'Mixed Content',
  };

  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

type Tip = { text: string; url?: string };
const TIPS: Record<EvidenceType, Tip[]> = {
  tracker: [
    { text: 'Remove or self-host analytics where possible.' },
    {
      text: 'Use Consent Mode or server-side analytics with IP anonymization.',
      url: 'https://developers.google.com/tag-platform/security/guides/consent',
    },
  ],
  thirdparty: [
    { text: 'Audit third-party scripts and remove unused vendors.' },
    {
      text: 'Use Subresource Integrity (SRI) when loading from CDNs.',
      url: 'https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity',
    },
    {
      text: 'Enforce strict CSP for scripts and connections.',
      url: 'https://developer.mozilla.org/docs/Web/HTTP/CSP',
    },
  ],
  cookie: [
    {
      text: 'Set Secure and SameSite attributes for all cookies.',
      url: 'https://developer.mozilla.org/docs/Web/HTTP/Cookies#security',
    },
    { text: 'Avoid setting cookies on non-HTTPS origins.' },
  ],
  header: [
    {
      text: 'Add CSP, Referrer-Policy, HSTS, X-Content-Type-Options, Permissions-Policy.',
      url: 'https://owasp.org/www-project-secure-headers/',
    },
  ],
  insecure: [
    {
      text: 'Serve all resources over HTTPS and avoid mixed content.',
      url: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content',
    },
  ],
  tls: [
    {
      text: 'Use modern TLS config (A grade), disable weak ciphers.',
      url: 'https://ssl-config.mozilla.org/',
    },
  ],
  policy: [{ text: 'Add a clear Privacy Policy link on the homepage.' }],
  fingerprint: [
    {
      text: 'Avoid fingerprinting techniques (canvas/audio/plugins access).',
      url: 'https://privacyguides.org/en/advanced/browser-fingerprinting/',
    },
  ],
  'mixed-content': [
    {
      text: 'Ensure all resources are loaded over HTTPS to prevent mixed content warnings.',
      url: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content',
    },
  ],
};

const severityOptions: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Med' },
  { key: 'low', label: 'Low' },
];

const toSeverityFilter = (value: string | null): SeverityFilter => {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'all';
};

const isDataSharingLevel = (value: unknown): value is DataSharingLevel =>
  value === 'None' || value === 'Low' || value === 'Medium' || value === 'High';

const getDetailString = (details: unknown, key: string): string => {
  if (typeof details === 'object' && details !== null) {
    const value = (details as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return '';
};

const getTlsGrade = (details: unknown): 'A' | 'B' | 'C' | 'D' | 'F' | undefined => {
  if (typeof details === 'object' && details !== null) {
    const grade = (details as Record<string, unknown>).grade;
    if (grade === 'A' || grade === 'B' || grade === 'C' || grade === 'D' || grade === 'F') return grade;
  }
  return undefined;
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Generates a human-readable summary of the scan results
 * Based on score, tracker count, and evidence count
 */
const generateSummary = (scan: ReportResponse['scan'], evidence: EvidenceItem[]): string => {
  const score = scan.score ?? 0;
  const evidenceCount = evidence.length;
  const trackerCount = evidence.filter(e =>
    e.kind === 'tracker' || e.title?.toLowerCase().includes('tracker')
  ).length;

  if (score >= 90) {
    return `This site has excellent privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected and strong security measures. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 80) {
    return `This site has good privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Some minor improvements possible. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 70) {
    return `This site has fair privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Several areas need attention. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else if (score >= 60) {
    return `This site has concerning privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Many improvements needed. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  } else {
    return `This site has poor privacy practices with ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected. Significant privacy risks found. ${evidenceCount} total finding${evidenceCount !== 1 ? 's' : ''} analyzed.`;
  }
};

/**
 * Sanitizes evidence data before client exposure
 * Removes internal fields and sensitive information
 */
const sanitizeEvidence = (evidence: EvidenceItem[]): EvidenceItem[] => {
  return evidence.map(item => {
    // Create a safe copy with only public fields
    const sanitized: EvidenceItem = {
      id: item.id,
      scanId: item.scanId,
      kind: item.kind,
      title: item.title,
      severity: item.severity,
      details: sanitizeDetails(item.details),
      createdAt: item.createdAt
    };

    return sanitized;
  });
};

/**
 * Sanitizes details object to remove sensitive internal data
 */
const sanitizeDetails = (details: unknown): unknown => {
  if (typeof details !== 'object' || details === null) {
    return details;
  }

  const sanitized = { ...details as Record<string, unknown> };

  // Remove internal/sensitive fields
  const internalFields = [
    '_internal',
    'rawData',
    'scannerMeta',
    'debugInfo',
    'internalId',
    'systemInfo',
    'processInfo'
  ];

  internalFields.forEach(field => {
    delete sanitized[field];
  });

  // Sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeDetails(sanitized[key]);
    }
  });

  return sanitized;
};

const shareCurrentUrl = async () => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (!url) return;
  if (navigator.share) {
    try {
      await navigator.share({ url });
      toast.success('Link shared successfully!');
      return;
    } catch {
      /* ignore to fall back */
    }
  }
  try {
    await navigator.clipboard?.writeText(url);
    toast.success('Link copied to clipboard!');
  } catch {
    toast.error('Failed to copy link');
  }
};

const copyCurrentUrl = async () => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  if (!url) return;
  try {
    await navigator.clipboard?.writeText(url);
    toast.success('Link copied to clipboard!');
  } catch {
    toast.error('Failed to copy link');
  }
};

/**
 * Enhanced evidence item component with complete color coding
 */
interface EvidenceItemDisplayProps {
  evidence: EvidenceItem;
}

function EvidenceItemDisplay({ evidence }: EvidenceItemDisplayProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [whyMattersExpanded, setWhyMattersExpanded] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(evidence.title);
      setCopied(true);
      toast.success('Finding copied to clipboard!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Get severity icon and color based on severity level
  const getSeverityVisual = (severity: number) => {
    if (severity >= 4) {
      return {
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="8" />
          </svg>
        ),
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border border-red-400/30',
        label: 'Critical'
      };
    }
    if (severity === 3) {
      return {
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="8" />
          </svg>
        ),
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border border-orange-400/30',
        label: 'High'
      };
    }
    if (severity === 2) {
      return {
        icon: (
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="8" />
          </svg>
        ),
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border border-yellow-400/30',
        label: 'Medium'
      };
    }
    return {
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="10" r="8" />
        </svg>
      ),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border border-green-400/30',
      label: 'Low'
    };
  };

  // Determine status based on severity
  const getStatusClass = (severity: number): 'good' | 'warning' | 'bad' => {
    if (severity >= 4) return 'bad';
    if (severity >= 3) return 'warning';
    return 'good';
  };

  const status = getStatusClass(evidence.severity);
  const severityVisual = getSeverityVisual(evidence.severity);

  const statusConfig = {
    good: {
      bg: 'bg-score-trust/10',
      border: 'border-l-4 border-score-trust',
      icon: '✅',
      iconColor: 'text-score-trust',
      textColor: 'text-zinc-900'
    },
    warning: {
      bg: 'bg-score-caution/10',
      border: 'border-l-4 border-score-caution',
      icon: '⚠️',
      iconColor: 'text-score-caution',
      textColor: 'text-zinc-900'
    },
    bad: {
      bg: 'bg-score-danger/10',
      border: 'border-l-4 border-score-danger',
      icon: '❌',
      iconColor: 'text-score-danger',
      textColor: 'text-zinc-900'
    }
  };

  const config = statusConfig[status];

  // Generate "Why this matters" message based on type
  const getWhyItMatters = (type: string): string | null => {
    const messages: Record<string, string> = {
      tracker: 'This tracker can follow your browsing across websites and build profiles about you.',
      cookie: 'Cookies can store personal information and track your behavior across sessions.',
      thirdparty: 'Third-party connections can share your data with external services without your explicit knowledge.',
      fingerprint: 'Fingerprinting techniques can uniquely identify your device even without cookies.',
      insecure: 'Security vulnerabilities can expose your data to attackers and compromise your privacy.',
      header: 'Missing security headers can leave the site vulnerable to various attacks.',
      tls: 'Weak encryption can allow attackers to intercept and read your data.',
      'mixed-content': 'Mixed content warnings indicate resources loaded over insecure connections.',
    };
    return messages[type] || null;
  };

  const whyItMatters = getWhyItMatters(evidence.kind);

  return (
    <div
      className={`${config.bg} ${config.border} rounded-lg p-4 mb-3 transition-all duration-200 hover:shadow-md group`}
      data-testid="evidence-item"
      role="article"
      aria-label={`${evidence.title} - Severity ${evidence.severity}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`text-2xl ${config.iconColor} flex-shrink-0`}
          aria-hidden="true"
          role="img"
        >
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className={`font-semibold text-zinc-900 text-base flex-1`}>
              {evidence.title}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Copy finding to clipboard"
                title="Copy finding"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${severityVisual.bgColor} ${severityVisual.borderColor}`}
                aria-label={`${severityVisual.label} severity`}
                title={`Severity: ${severityVisual.label} (${evidence.severity}/5)`}
              >
                <span className={severityVisual.color}>
                  {severityVisual.icon}
                </span>
                <span className={`text-xs font-medium ${severityVisual.color}`}>
                  {severityVisual.label}
                </span>
              </div>
            </div>
          </div>

          {/* Only show details if there's meaningful content */}
          {(() => {
            const sanitized = sanitizeDetails(evidence.details);
            const hasDetails = sanitized && (
              typeof sanitized === 'string'
                ? sanitized.trim().length > 0
                : Object.keys(sanitized as object).length > 0
            );

            if (!hasDetails) return null;

            return (
              <>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`text-sm font-medium mt-2 focus:outline-none focus:ring-2 focus:ring-advisor-500 rounded px-2 py-1 transition-colors ${
                    status === 'bad' ? 'text-score-danger hover:bg-score-danger/10' :
                    status === 'warning' ? 'text-score-caution hover:bg-score-caution/10' :
                    'text-score-trust hover:bg-score-trust/10'
                  }`}
                  aria-expanded={showDetails}
                  aria-controls={`details-${evidence.id}`}
                >
                  {showDetails ? '▼ Hide details' : '▶ Show details'}
                </button>

                {showDetails && (
                  <div
                    id={`details-${evidence.id}`}
                    className="mt-3 p-3 bg-zinc-100 rounded border border-zinc-300 shadow-sm"
                  >
                    <pre className="text-xs text-zinc-800 whitespace-pre-wrap font-mono overflow-x-auto">
                      {typeof sanitized === 'string'
                        ? sanitized
                        : safeStringify(sanitized)}
                    </pre>
                  </div>
                )}
              </>
            );
          })()}

          {/* "Why this matters" info box - Collapsible */}
          {whyItMatters && (
            <div className="mt-3">
              <button
                onClick={() => setWhyMattersExpanded(!whyMattersExpanded)}
                className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center justify-between gap-2"
                aria-expanded={whyMattersExpanded}
                aria-controls={`why-matters-${evidence.id}`}
              >
                <span className="text-sm text-zinc-900 flex items-center gap-2">
                  <span className="text-lg flex-shrink-0" aria-hidden="true">💡</span>
                  <strong className="font-semibold">Why this matters</strong>
                </span>
                <svg
                  className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ${whyMattersExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {whyMattersExpanded && (
                <div
                  id={`why-matters-${evidence.id}`}
                  className="mt-2 p-3 bg-zinc-100 border border-zinc-300 rounded-lg text-sm text-zinc-800 animate-fade-in"
                >
                  {whyItMatters}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery(reportQueryOptions(slug));

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (isError || !data) {
    // Determine the type of error for better user messaging
    const isSchemaError = error?.message?.includes('validation') || error?.name === 'ZodError';
    const is404Error = error?.message?.includes('Report not found');

    const errorTitle = isSchemaError
      ? "Report Data Error"
      : is404Error
      ? "Report Not Found"
      : "Failed to Load Report";

    const errorDescription = isSchemaError
      ? `The report data for "${slug}" could not be processed correctly. This might be due to a data format issue. Our team has been notified.`
      : is404Error
      ? `The report with ID "${slug}" could not be found. It may have been removed or the link might be incorrect.`
      : `There was an error loading the report "${slug}". This might be a temporary issue. Please try again.`;

    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
            aria-label="Back to home"
          >
            <span aria-hidden="true">&larr;</span>
            Home
          </Link>
        </div>

        <ErrorState
          error={error || new Error('Report not found')}
          title={errorTitle}
          description={errorDescription}
          onRetry={() => refetch()}
          onGoHome={() => window.location.href = '/'}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </main>
    );
  }

  return <ReportBody slug={slug} data={data} />;
}

/**
 * Loading skeleton for the report page
 */
function ReportSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardSkeleton className="w-20 h-8" />
      </div>

      {/* Title and score skeleton */}
      <header className="flex items-center gap-4">
        <ScoreDialSkeleton size="md" />
        <div className="space-y-2 flex-1">
          <CardSkeleton className="h-8 w-80" />
          <CardSkeleton className="h-5 w-64" />
          <CardSkeleton className="h-4 w-96" />
        </div>
        <div className="space-x-2">
          <CardSkeleton className="w-20 h-8 inline-block" />
          <CardSkeleton className="w-24 h-8 inline-block" />
          <CardSkeleton className="w-12 h-8 inline-block" />
        </div>
      </header>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} className="w-16 h-8" />
        ))}
      </div>

      {/* Evidence sections skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <EvidenceCardSkeleton key={i} showExpandedContent={i === 0} />
        ))}
      </div>
    </div>
  );
}

type BreakdownItem = {
  category: string;
  finding: string;
  points: number;
  positive: boolean;
};

/**
 * Calculates score breakdown based on evidence
 * Shows how points were deducted or awarded
 */
const calculateBreakdown = (scan: ReportResponse['scan'], evidence: EvidenceItem[]): BreakdownItem[] => {
  const breakdown: BreakdownItem[] = [
    {
      category: 'Base Score',
      finding: 'Starting point',
      points: 100,
      positive: true
    }
  ];

  // Analyze evidence for deductions
  const trackers = evidence.filter(e =>
    e.kind === 'tracker' || e.title?.toLowerCase().includes('tracker')
  );

  if (trackers.length > 0) {
    breakdown.push({
      category: 'Trackers',
      finding: `${trackers.length} tracker${trackers.length !== 1 ? 's' : ''} found`,
      points: -Math.min(trackers.length * 5, 30),
      positive: false
    });
  } else {
    breakdown.push({
      category: 'Trackers',
      finding: 'No trackers detected',
      points: 0,
      positive: true
    });
  }

  // HTTPS/TLS check
  const tlsEvidence = evidence.find(e => e.kind === 'tls');
  const hasValidTls = tlsEvidence && tlsEvidence.severity <= 2;
  if (hasValidTls) {
    breakdown.push({
      category: 'HTTPS/TLS',
      finding: 'Valid certificate',
      points: 0,
      positive: true
    });
  } else if (tlsEvidence) {
    breakdown.push({
      category: 'HTTPS/TLS',
      finding: 'TLS configuration issues',
      points: -10,
      positive: false
    });
  }

  // Mixed content
  const hasMixedContent = evidence.some(e =>
    e.kind === 'mixed-content' || (e.title?.toLowerCase().includes('mixed content') && e.severity >= 3)
  );
  if (hasMixedContent) {
    breakdown.push({
      category: 'Mixed Content',
      finding: 'Insecure resources found',
      points: -10,
      positive: false
    });
  }

  // Security headers
  const missingHeaders = evidence.filter(e =>
    e.kind === 'header' && e.severity >= 3
  );
  if (missingHeaders.length > 0) {
    breakdown.push({
      category: 'Security Headers',
      finding: `${missingHeaders.length} missing or weak header${missingHeaders.length !== 1 ? 's' : ''}`,
      points: -Math.min(missingHeaders.length * 3, 15),
      positive: false
    });
  }

  // Third-party connections
  const thirdParty = evidence.filter(e => e.kind === 'thirdparty');
  if (thirdParty.length > 5) {
    breakdown.push({
      category: 'Third-Party',
      finding: `${thirdParty.length} third-party connections`,
      points: -Math.min((thirdParty.length - 5) * 2, 15),
      positive: false
    });
  }

  // Cookies
  const cookies = evidence.filter(e => e.kind === 'cookie' && e.severity >= 3);
  if (cookies.length > 0) {
    breakdown.push({
      category: 'Cookies',
      finding: `${cookies.length} cookie issue${cookies.length !== 1 ? 's' : ''}`,
      points: -Math.min(cookies.length * 3, 12),
      positive: false
    });
  }

  return breakdown;
};

function ReportBody({ slug, data }: { slug: string; data: ReportResponse }) {
  const { scan, evidence, meta } = data;
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  // Handle scans that completed with error status (e.g., unreachable sites)
  if (scan.status === 'error') {
    const errorMeta = scan.meta as { error?: string; errorMessage?: string; suggestion?: string } | null;

    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
          <BackToHome />

          {/* Error State Card */}
          <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 rounded-2xl p-8 md:p-10 shadow-sm">
            <div className="flex flex-col items-center text-center gap-6">
              {/* Error Icon */}
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Error Title */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">
                  Unable to Scan Website
                </h1>
                <p className="text-zinc-600 text-base break-all">
                  {scan.input}
                </p>
              </div>

              {/* Error Message */}
              <div className="bg-white border border-amber-200 rounded-xl p-6 max-w-xl w-full">
                <p className="text-zinc-700 leading-relaxed">
                  {scan.summary || 'This website could not be scanned. It may be unavailable, not registered, or blocking our scanner.'}
                </p>
                {errorMeta?.suggestion && (
                  <p className="text-sm text-zinc-600 mt-3 pt-3 border-t border-gray-100">
                    <strong className="text-zinc-700">Suggestion:</strong> {errorMeta.suggestion}
                  </p>
                )}
              </div>

              {/* Possible Reasons */}
              <div className="text-left w-full max-w-xl">
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">This can happen when:</h2>
                <ul className="space-y-2 text-sm text-zinc-600">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    The website is down or temporarily unavailable
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    The domain is not registered or has expired
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    The website is blocking automated requests
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    The URL was mistyped or contains errors
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Another URL
                </Link>
              </div>
            </div>
          </div>

          {/* Scan Info Footer */}
          <div className="text-center text-xs text-zinc-500">
            <p>Scan ID: {scan.id}</p>
            {scan.finishedAt && (
              <p>Attempted: {new Date(scan.finishedAt).toLocaleString()}</p>
            )}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const trackerDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter((item) => item.kind === 'tracker').forEach((item) => {
      const domain = getDetailString(item.details, 'domain');
      if (domain) domains.add(domain);
    });
    return Array.from(domains);
  }, [evidence]);

  const thirdpartyDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter((item) => item.kind === 'thirdparty').forEach((item) => {
      const domain = getDetailString(item.details, 'domain');
      if (domain) domains.add(domain);
    });
    return Array.from(domains);
  }, [evidence]);

  const cookieIssues = evidence.filter((item) => item.kind === 'cookie').length;
  const tlsGrade = getTlsGrade(evidence.find((item) => item.kind === 'tls')?.details);

  const dataSharingLevel = React.useMemo((): DataSharingLevel => {
    if (isDataSharingLevel(meta?.dataSharing)) return meta.dataSharing;
    return computeDataSharingLevel(trackerDomains.length, thirdpartyDomains.length, cookieIssues);
  }, [cookieIssues, meta?.dataSharing, thirdpartyDomains.length, trackerDomains.length]);

  const groups = React.useMemo(() => {
    const acc: Partial<Record<EvidenceType, EvidenceItem[]>> = {};
    evidence.forEach((item) => {
      const kind = item.kind as EvidenceType;
      (acc[kind] ??= []).push(item);
    });
    return acc;
  }, [evidence]);

  const groupEntries = React.useMemo(() => Object.entries(groups) as [EvidenceType, EvidenceItem[]][], [groups]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [sevFilter, setSevFilter] = React.useState<SeverityFilter>(() => toSeverityFilter(searchParams.get('sev')));

  React.useEffect(() => {
    const expected = sevFilter === 'all' ? null : sevFilter;
    const current = searchParams.get('sev');
    if (expected !== current) {
      const next = new URLSearchParams(searchParams);
      if (expected === null) next.delete('sev');
      else next.set('sev', expected);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, sevFilter]);

  const [open, setOpen] = React.useState<Record<EvidenceType, boolean>>({} as Record<EvidenceType, boolean>);

  React.useEffect(() => {
    setOpen((previous) => {
      const next: Record<EvidenceType, boolean> = { ...previous };

      groupEntries.forEach(([type]) => {
        if (next[type] === undefined) {
          // QUICK WIN #1: Expand all sections by default for better UX
          // Users come to see findings, not hunt for expand buttons
          next[type] = true; // Old: next[type] = hasHighSeverity;
        }
      });

      return next;
    });
  }, [groupEntries]);

  const matchesFilter = React.useCallback(
    (severity: number) => {
      if (sevFilter === 'all') return true;
      if (sevFilter === 'high') return severity >= 4;
      if (sevFilter === 'medium') return severity === 3;
      return severity <= 2;
    },
    [sevFilter],
  );

  const toggle = React.useCallback((type: EvidenceType) => {
    setOpen((previous) => ({ ...previous, [type]: !previous[type] }));
  }, []);

  const sectionId = (type: EvidenceType) => `section-${type}`;

  const exportJson = React.useCallback(() => {
    const filtered = evidence.filter((item) => matchesFilter(item.severity));

    // Sanitize evidence before export to prevent data leakage
    const sanitizedEvidence = sanitizeEvidence(filtered);

    const payload = {
      scan: {
        id: scan.id,
        input: scan.input,
        score: scan.score,
        label: scan.label,
        slug
      },
      filter: sevFilter,
      exportedAt: new Date().toISOString(),
      evidence: sanitizedEvidence,
      metadata: {
        version: '1.0',
        format: 'privacy-advisor-report',
        sanitized: true
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `privacy-report-${slug}-${sevFilter}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [evidence, matchesFilter, scan.id, scan.input, scan.label, scan.score, sevFilter, slug]);

  // TLS status based on certificate grade (A/B = Valid, C/D = Weak, F/none = Invalid)
  // Note: Mixed content issues are shown separately under "Security Issues"
  const sslStatus = React.useMemo((): 'Valid' | 'Weak' | 'Invalid' => {
    if (!tlsGrade || tlsGrade === 'F') return 'Invalid';
    if (tlsGrade === 'D' || tlsGrade === 'C') return 'Weak';
    return 'Valid'; // A or B grades
  }, [tlsGrade]);

  const topTrackers = trackerDomains.slice(0, 2);

  // Extract domain from scan input for SEO
  const getDomainFromUrl = (url: string): string => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const domain = getDomainFromUrl(scan.input);
  const trackerCount = trackerDomains.length;
  const score = scan.score ?? 0;
  const label = scan.label ?? 'Unknown';

  // SEO: Generate dynamic meta title and description
  const seoTitle = `${domain} Privacy Report - Score ${score}/100 | Gecko Advisor`;
  const seoDescription = `Privacy analysis of ${domain}: ${label} rating with score ${score}/100. ${trackerCount} tracker${trackerCount !== 1 ? 's' : ''} detected, ${thirdpartyDomains.length} third-party connection${thirdpartyDomains.length !== 1 ? 's' : ''}. Free privacy scan from Gecko Advisor.`;
  const canonicalUrl = `https://geckoadvisor.com/r/${slug}`;

  // SEO: Structured data for search engines (Review schema)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'WebSite',
      name: domain,
      url: scan.input.startsWith('http') ? scan.input : `https://${scan.input}`,
    },
    author: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
      url: 'https://geckoadvisor.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Gecko Advisor',
      url: 'https://geckoadvisor.com',
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: score.toString(),
      bestRating: '100',
      worstRating: '0',
    },
    datePublished: scan.createdAt,
    description: `Privacy analysis of ${domain}: ${trackerCount} trackers detected, data sharing level: ${dataSharingLevel}`,
    reviewBody: `This privacy scan analyzed ${domain} for trackers, cookies, security headers, and third-party connections. The site received a privacy score of ${score}/100 (${label}) with ${trackerCount} trackers and ${thirdpartyDomains.length} third-party connections detected.`,
  };

  // SEO: Breadcrumb structured data
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://geckoadvisor.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Reports',
        item: 'https://geckoadvisor.com/reports',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${domain} Privacy Report`,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      {/* SEO: Dynamic meta tags and structured data */}
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={`${domain} privacy, ${domain} trackers, ${domain} cookies, website privacy score, privacy analysis, tracker detection`} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Gecko Advisor" />
        <meta property="og:image" content="https://geckoadvisor.com/og-image.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content="https://geckoadvisor.com/twitter-image.png" />
        <meta name="twitter:site" content="@GeckoAdvisor" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      </Helmet>

      {/* Desktop header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm md:hidden">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link
              to="/"
              className="text-emerald-600 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded p-1"
              aria-label="Back to home"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-900 truncate">{scan.input}</div>
              <div className="text-xs text-zinc-600">
                {scan.label} ({scan.score}%)
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold
              ${(scan.score ?? 0) >= 70 ? 'bg-score-trust/20 text-score-trust' :
                (scan.score ?? 0) >= 40 ? 'bg-score-caution/20 text-score-caution' :
                'bg-score-danger/20 text-score-danger'}
            `}>
              {scan.score ?? 0}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Back to Home button - Desktop only (mobile has back button in sticky header) */}
      <div className="hidden md:block">
        <BackToHome />
      </div>

      {/* Refined report header - clean, spacious layout */}
      <header className="bg-gradient-to-br from-stone-50 to-white border border-gray-200 rounded-2xl p-8 md:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">

          {/* LEFT: Score Dial (25% width on desktop) */}
          <div className="flex flex-col items-center gap-3 mx-auto md:mx-0 md:w-1/4">
            <EnhancedScoreDial score={scan.score ?? 0} size="lg" label={scan.label ?? undefined} />
          </div>

          {/* RIGHT: Report Information (75% width on desktop) */}
          <div className="flex-1 space-y-5 text-center md:text-left">

            {/* Heading - Clean, no status label */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
                Privacy Report
              </h1>

              {/* URL with inline copy button */}
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-4">
                <p className="text-zinc-600 text-base break-all">
                  {scan.input}
                </p>
                <CopyButton text={typeof window !== 'undefined' ? window.location.href : ''} />
              </div>

              {/* Grade Badge - Standalone, prominent */}
              <div className="flex justify-center md:justify-start">
                <GradeBadge score={scan.score ?? 0} size="lg" showLabel={true} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap pt-2">

              {/* Primary action - Scan Another */}
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-white"
                aria-label="Scan another website"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Scan Another</span>
              </Link>

              {/* Secondary icon buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  className="p-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  title="Copy report link"
                  aria-label="Copy report link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  title="Print report"
                  aria-label="Print report"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>

                <button
                  onClick={exportJson}
                  className="p-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  title="Export as JSON"
                  aria-label="Export report as JSON"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Summary Box */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-zinc-900 font-semibold text-lg mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Quick Summary
        </h2>
        <p className="text-zinc-600 leading-relaxed">
          {generateSummary(scan, evidence)}
        </p>
      </div>

      {/* Stats Row - Removed duplicate Score card, showing only unique data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-zinc-500 inline-flex items-center gap-2">
            Data Sharing Risk
            <InfoPopover label="Data Sharing Risk">
              Indicates the level of data sharing based on trackers, third-party connections, and cookies. Lower is better.
            </InfoPopover>
          </div>
          {/* QUICK WIN #3: Enhanced color coding with background colors and status icons */}
          <div className={`mt-2 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 ${
            dataSharingLevel === 'None' ? 'bg-emerald-100 text-emerald-700' :
            dataSharingLevel === 'Low' ? 'bg-emerald-50 text-emerald-600' :
            dataSharingLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {/* Add status icons for visual clarity and accessibility */}
            {dataSharingLevel === 'None' && <span className="text-lg" aria-hidden="true">✅</span>}
            {dataSharingLevel === 'Low' && <span className="text-lg" aria-hidden="true">✓</span>}
            {dataSharingLevel === 'Medium' && <span className="text-lg" aria-hidden="true">⚠️</span>}
            {dataSharingLevel === 'High' && <span className="text-lg" aria-hidden="true">⛔</span>}
            <span className="text-xl font-semibold">{dataSharingLevel}</span>
          </div>
          {/* Helpful description for each level */}
          <p className="text-xs text-zinc-600 mt-1.5">
            {dataSharingLevel === 'None' && 'No trackers or third-party data sharing detected'}
            {dataSharingLevel === 'Low' && 'Minimal data sharing with limited third parties'}
            {dataSharingLevel === 'Medium' && 'Moderate data sharing with several third parties'}
            {dataSharingLevel === 'High' && 'Extensive data sharing with many third parties'}
          </p>
          <div className="text-xs text-zinc-600 mt-1">
            <span className="sr-only">Breakdown: </span>
            Trackers: {trackerDomains.length}
            <span className="mx-1 text-zinc-500" aria-hidden="true">•</span>
            Third-party: {thirdpartyDomains.length}
            <span className="mx-1 text-zinc-500" aria-hidden="true">•</span>
            Cookies: {cookieIssues}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-zinc-500">TLS/HTTPS</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-900">{sslStatus}</div>
          <div className="text-xs text-zinc-600">
            {tlsGrade ? `TLS grade: ${tlsGrade}` : 'TLS grade: Not rated'}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-zinc-500">Top trackers</div>
          <div className="mt-2 text-sm text-zinc-600">
            {topTrackers.length > 0 ? topTrackers.join(', ') : 'None detected'}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm" role="tablist" aria-label="Severity filter (1 All, 2 High, 3 Med, 4 Low)">
        {severityOptions.map((option) => (
          <button
            key={option.key}
            role="tab"
            aria-selected={sevFilter === option.key}
            className={`px-3 py-3 min-h-[44px] rounded-full border transition-colors ${
              sevFilter === option.key
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-gray-100 border-gray-200 text-zinc-900 hover:bg-gray-200'
            }`}
            onClick={() => setSevFilter(option.key)}
          >
            {option.label}
          </button>
        ))}
        <span className="text-xs text-zinc-500 hidden sm:inline">
          <span className="sr-only">Keyboard shortcuts: </span>
          Keys: 1=All, 2=High, 3=Med, 4=Low
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {groupEntries.map(([type, list]) => {
          const high = list.filter((item) => item.severity >= 4).length;
          const medium = list.filter((item) => item.severity === 3).length;
          const low = list.filter((item) => item.severity <= 2).length;
          return (
            <a
              key={type}
              href={`#${sectionId(type)}`}
              className="px-2 py-1 rounded-full bg-white text-zinc-900 border border-gray-200 hover:bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors shadow-sm"
              aria-label={`${getCategoryLabel(type)} ${list.length} items: ${high} high, ${medium} medium, ${low} low`}
            >
              <span>{getCategoryLabel(type)}</span>
              <span className="ml-1 font-semibold">{list.length}</span>
              <span className="ml-2 inline-flex items-center gap-1">
                <span
                  className="px-1 rounded-full text-2xs font-medium bg-score-danger/20 text-score-danger border border-score-danger/30"
                  title="High severity issues"
                  role="status"
                  aria-label={`${high} high severity issues`}
                >
                  <span aria-hidden="true">⚠️</span> {high}
                </span>
                <span
                  className="px-1 rounded-full text-2xs font-medium bg-score-caution/20 text-score-caution border border-score-caution/30"
                  title="Medium severity issues"
                  role="status"
                  aria-label={`${medium} medium severity issues`}
                >
                  <span aria-hidden="true">⚡</span> {medium}
                </span>
                <span
                  className="px-1 rounded-full text-2xs font-medium bg-gray-100 text-zinc-600 border border-gray-200"
                  title="Low severity issues"
                  role="status"
                  aria-label={`${low} low severity issues`}
                >
                  <span aria-hidden="true">ℹ️</span> {low}
                </span>
              </span>
            </a>
          );
        })}
      </div>

      {/* Categorized Evidence Overview - Enhanced with color-coding and severity bars */}
      {evidence.length > 0 && (
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">📊</span>
              Evidence Categories
            </h2>
            <span className="text-sm text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-full font-medium border border-zinc-200">
              {evidence.length} total findings
            </span>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(categorizeEvidence(evidence)).map(([key, category]) => {
              if (category.items.length === 0) return null;

              const filteredCategoryItems = category.items.filter((item) => matchesFilter(item.severity));
              if (filteredCategoryItems.length === 0) return null;

              const stats = getCategorySeverityStats(filteredCategoryItems);

              return (
                <div
                  key={key}
                  className={`${category.color.bg} rounded-xl p-5 shadow-sm border-2 ${category.color.border} transition-all hover:shadow-md`}
                >
                  {/* Category Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${category.color.iconBg} rounded-xl flex items-center justify-center`}>
                        <span className="text-2xl" aria-hidden="true">{category.icon}</span>
                      </div>
                      <div>
                        <h3 className={`text-lg font-bold ${category.color.text}`}>
                          {category.title}
                        </h3>
                        <p className="text-sm text-zinc-600">{category.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Severity Distribution Bar */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-zinc-700">Severity Distribution</span>
                      <span className="text-xs text-zinc-500">({stats.total} items)</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-white/50 border border-white/80">
                      {stats.critical > 0 && (
                        <div
                          className="bg-red-500 transition-all"
                          style={{ width: `${(stats.critical / stats.total) * 100}%` }}
                          title={`${stats.critical} critical`}
                        />
                      )}
                      {stats.high > 0 && (
                        <div
                          className="bg-orange-500 transition-all"
                          style={{ width: `${(stats.high / stats.total) * 100}%` }}
                          title={`${stats.high} high`}
                        />
                      )}
                      {stats.medium > 0 && (
                        <div
                          className="bg-yellow-500 transition-all"
                          style={{ width: `${(stats.medium / stats.total) * 100}%` }}
                          title={`${stats.medium} medium`}
                        />
                      )}
                      {stats.low > 0 && (
                        <div
                          className="bg-green-500 transition-all"
                          style={{ width: `${(stats.low / stats.total) * 100}%` }}
                          title={`${stats.low} low`}
                        />
                      )}
                    </div>
                    {/* Severity Legend */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                      {stats.critical > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="text-zinc-700 font-medium">{stats.critical} Critical</span>
                        </span>
                      )}
                      {stats.high > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <span className="text-zinc-700 font-medium">{stats.high} High</span>
                        </span>
                      )}
                      {stats.medium > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                          <span className="text-zinc-700 font-medium">{stats.medium} Medium</span>
                        </span>
                      )}
                      {stats.low > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <span className="text-zinc-700 font-medium">{stats.low} Low</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Evidence Items - Scrollable container */}
                  <div className="bg-white/60 rounded-lg p-3 max-h-[400px] overflow-y-auto border border-white/80">
                    <div className="space-y-2">
                      {filteredCategoryItems.map((item) => (
                        <EvidenceItemDisplay key={`cat-${key}-${item.id}`} evidence={item} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evidence section controls */}
      <div className="flex items-center justify-between py-3 px-4 bg-stone-50 rounded-lg border border-gray-200">
        <div className="text-sm text-zinc-600">
          <span className="font-medium text-zinc-900">
            {groupEntries.filter(([type]) => open[type]).length}
          </span>
          {' of '}
          <span className="font-medium text-zinc-900">
            {groupEntries.length}
          </span>
          {' technical categories visible'}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const allOpen: Record<EvidenceType, boolean> = {} as Record<EvidenceType, boolean>;
              groupEntries.forEach(([type]) => { allOpen[type] = true; });
              setOpen(allOpen);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
            aria-label="Expand all evidence categories"
          >
            Expand all
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <button
            onClick={() => {
              const allClosed: Record<EvidenceType, boolean> = {} as Record<EvidenceType, boolean>;
              groupEntries.forEach(([type]) => { allClosed[type] = false; });
              setOpen(allClosed);
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors"
            aria-label="Collapse all evidence categories"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">Technical Details by Type</h2>
        <p className="text-sm text-zinc-600">Expand sections below for granular technical findings</p>
      </div>

      {groupEntries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-zinc-900 font-semibold mb-2">
              No privacy issues found
            </p>
            <p className="text-sm text-zinc-600">
              This site appears to have excellent privacy practices.
            </p>
          </div>
        </Card>
      ) : (
        groupEntries.map(([type, list]) => {
          const filteredItems = list.filter((item) => matchesFilter(item.severity));
          const hasFilteredItems = filteredItems.length > 0;

          // Calculate max severity for section label
          const maxSeverity = Math.max(...list.map(item => item.severity));
          const hasCriticalIssues = maxSeverity >= 3;

          const getSectionSeverityLabel = (maxSev: number) => {
            if (maxSev >= 4) return { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-400/30' };
            if (maxSev === 3) return { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-400/30' };
            if (maxSev === 2) return { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-400/30' };
            return { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-400/30' };
          };

          const sectionSeverity = getSectionSeverityLabel(maxSeverity);

          return (
            <Card key={type} className={hasCriticalIssues ? 'border-l-4 border-orange-500/50' : ''}>
              <button
                className="w-full flex items-center justify-between py-3 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded transition-colors duration-150 hover:bg-gray-50"
                aria-expanded={open[type] ? 'true' : 'false'}
                aria-controls={sectionId(type)}
                onClick={() => toggle(type)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <h2 className="font-semibold text-lg text-zinc-900">
                    {getCategoryLabel(type)}
                  </h2>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${sectionSeverity.bgColor} border ${sectionSeverity.borderColor} text-xs font-semibold ${sectionSeverity.color}`}>
                    {sectionSeverity.label}
                  </span>

                  {!open[type] && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-zinc-600 text-xs font-medium border border-gray-200">
                      {list.length} item{list.length !== 1 ? 's' : ''} collapsed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Severity distribution (visible when collapsed or always on desktop) */}
                  <div className={`${open[type] ? 'hidden sm:flex' : 'flex'} items-center gap-2`}>
                    {(() => {
                      const highCount = list.filter(item => item.severity >= 4).length;
                      const mediumCount = list.filter(item => item.severity === 3).length;
                      const lowCount = list.filter(item => item.severity <= 2).length;

                      return (
                        <>
                          {highCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-score-danger/20 border border-score-danger/30 text-xs font-bold"
                              title={`${highCount} high severity issue${highCount !== 1 ? 's' : ''}`}
                            >
                              <span className="text-base">⚠️</span>
                              <span className="text-score-danger">{highCount}</span>
                            </span>
                          )}
                          {mediumCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-score-caution/20 border border-score-caution/30 text-xs font-bold"
                              title={`${mediumCount} medium severity issue${mediumCount !== 1 ? 's' : ''}`}
                            >
                              <span className="text-base">⚡</span>
                              <span className="text-score-caution">{mediumCount}</span>
                            </span>
                          )}
                          {lowCount > 0 && !open[type] && (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-xs font-bold"
                              title={`${lowCount} low severity issue${lowCount !== 1 ? 's' : ''}`}
                            >
                              <span className="text-base">ℹ️</span>
                              <span className="text-zinc-600">{lowCount}</span>
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Expand/Collapse icon with rotation animation */}
                  <svg
                    className={`w-5 h-5 text-zinc-500 transition-transform duration-200 ${open[type] ? 'rotate-180' : 'rotate-0'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>
              {open[type] && (
                <>
                  {!hasFilteredItems ? (
                    <div className="text-center py-8 mt-2 border-t border-gray-200">
                      <div className="text-3xl mb-3">✅</div>
                      <p className="text-zinc-600 mb-2">
                        No {sevFilter !== 'all' ? sevFilter + ' severity' : ''} issues found in this category.
                      </p>
                      <p className="text-sm text-zinc-500">
                        {sevFilter !== 'all' ? 'Try viewing other severity levels or select "All".' : 'This is a good sign!'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Use virtualized list for large evidence collections (>20 items) */}
                      {list.length > 20 ? (
                        <div className="mt-2">
                          <VirtualizedEvidenceList
                            items={list}
                            matchesFilter={matchesFilter}
                            sanitizeDetails={sanitizeDetails}
                            containerHeight={300}
                            itemHeight={80}
                            className="border border-gray-200 rounded"
                          />
                        </div>
                      ) : (
                        <div id={sectionId(type)} className="mt-2 space-y-2">
                          {filteredItems.map((item) => (
                            <EvidenceItemDisplay key={item.id} evidence={item} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {TIPS[type] && hasFilteredItems && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="font-semibold text-zinc-900 flex items-center gap-2 mb-2">
                        <span className="text-lg" aria-hidden="true">🔧</span>
                        How to fix
                      </div>
                      <ul className="list-disc pl-5 text-zinc-800 space-y-1">
                        {TIPS[type].map((tip, index) => (
                          <li key={index}>
                            {tip.url ? (
                              <a className="text-emerald-700 hover:text-emerald-800 underline font-medium" href={tip.url} target="_blank" rel="noreferrer">
                                {tip.text}
                              </a>
                            ) : (
                              tip.text
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })
      )}

      {/* Score Breakdown Section */}
      <div className="mt-8 mb-6 border-t border-gray-200 pt-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 text-zinc-900 hover:text-emerald-600 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded px-1 py-1"
          aria-expanded={showBreakdown}
          aria-controls="score-breakdown-details"
        >
          <svg
            className={`w-5 h-5 transition-transform ${showBreakdown ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          How was this score calculated?
        </button>

        {showBreakdown && (
          <div
            id="score-breakdown-details"
            className="mt-4 bg-stone-50 rounded-lg p-6 animate-fade-in border border-gray-200"
            role="region"
            aria-label="Score breakdown details"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-zinc-900">Category</th>
                    <th className="text-left py-2 px-3 font-semibold text-zinc-900">Finding</th>
                    <th className="text-right py-2 px-3 font-semibold text-zinc-900">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateBreakdown(scan, evidence).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-3 text-zinc-900">{item.category}</td>
                      <td className="py-2 px-3 text-zinc-600">{item.finding}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${
                        item.positive ? 'text-score-trust' : item.points === 0 ? 'text-zinc-600' : 'text-score-danger'
                      }`}>
                        {item.points > 0 && '+'}{item.points}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td colSpan={2} className="py-3 px-3 text-zinc-900">Final Score</td>
                    <td className="py-3 px-3 text-right text-lg text-zinc-900">{scan.score ?? 0}/100</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-zinc-600">
              <strong className="text-zinc-900">Note:</strong> This is a simplified breakdown. The actual scoring algorithm considers additional factors including privacy policies, security headers, and data sharing patterns.
            </p>
          </div>
        )}
      </div>

      <footer className="text-xs text-zinc-500 space-y-1">
        <div>Sources: EasyPrivacy (server-side; attribution), WhoTracks.me (CC BY 4.0), Public Suffix List</div>
        <div>
          Share: <button className="underline text-emerald-600 hover:text-emerald-700" onClick={shareCurrentUrl}>Copy / Share Link</button>
          {' - '}
          <button className="underline text-emerald-600 hover:text-emerald-700" onClick={copyCurrentUrl}>Save Result</button>
          {' - '}
          <a className="underline text-emerald-600 hover:text-emerald-700" href={`/compare?left=${encodeURIComponent(slug)}`}>Compare</a>
        </div>
      </footer>
    </main>
    <Footer />
    </>
  );
}
