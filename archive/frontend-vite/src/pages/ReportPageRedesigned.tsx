/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT

ReportPage Redesign - Privacy-First User Experience
=====================================================

Design Goals:
1. 5-10 second comprehension - Users understand privacy status at a glance
2. Traffic light system - Visual indicators (not just colors)
3. Tab-based navigation - No excessive scrolling
4. Progressive disclosure - Summary first, details on demand
5. Mobile-first - Excellent experience on all devices

Key Changes from Original:
- Replaced vertical scroll with horizontal tabs
- Added PrivacyStatusCard for instant comprehension
- Moved detailed evidence into category tabs
- Surfaced topFixes (previously unused in UI)
- Reduced cognitive load with collapsed-by-default details
*/
import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { reportQueryOptions } from '../lib/api';
import EnhancedScoreDial from '../components/EnhancedScoreDial';
import CopyButton from '../components/CopyButton';
import { ScoreDialSkeleton, CardSkeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorBoundary';
import Footer from '../components/Footer';
import Header from '../components/Header';
import GradeBadge from '../components/GradeBadge';
import ReportTabs, { type TabId } from '../components/ReportTabs';
import { OverviewTab, CategoryTab } from '../components/report-tabs';
import type { ReportResponse } from '@gecko-advisor/shared';
import { computeDataSharingLevel, type DataSharingLevel } from '../lib/dataSharing';

type EvidenceItem = ReportResponse['evidence'][number];

/**
 * Risk level type for semantic styling
 */
type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Get risk level from score for styling
 */
const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 70) return 'low';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'high';
  return 'critical';
};

/**
 * Get glow class based on risk level
 */
const getGlowClass = (riskLevel: RiskLevel): string => {
  const glowClasses: Record<RiskLevel, string> = {
    low: 'shadow-glow-low',
    moderate: 'shadow-glow-moderate',
    high: 'shadow-glow-high',
    critical: 'shadow-glow-critical',
  };
  return glowClasses[riskLevel];
};

// Tips for each category
const CATEGORY_TIPS = {
  tracking: [
    { text: 'Remove or self-host analytics where possible.' },
    { text: 'Use Consent Mode or server-side analytics with IP anonymization.', url: 'https://developers.google.com/tag-platform/security/guides/consent' },
    { text: 'Audit third-party scripts and remove unused vendors.' },
  ],
  security: [
    { text: 'Add CSP, Referrer-Policy, HSTS, X-Content-Type-Options, Permissions-Policy.', url: 'https://owasp.org/www-project-secure-headers/' },
    { text: 'Use modern TLS config (A grade), disable weak ciphers.', url: 'https://ssl-config.mozilla.org/' },
    { text: 'Serve all resources over HTTPS and avoid mixed content.', url: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content' },
  ],
  cookies: [
    { text: 'Set Secure and SameSite attributes for all cookies.', url: 'https://developer.mozilla.org/docs/Web/HTTP/Cookies#security' },
    { text: 'Avoid setting cookies on non-HTTPS origins.' },
    { text: 'Minimize cookie lifetime for non-essential cookies.' },
  ],
};

/**
 * Sanitizes evidence data before client exposure
 */
const sanitizeDetails = (details: unknown): unknown => {
  if (typeof details !== 'object' || details === null) {
    return details;
  }

  const sanitized = { ...details as Record<string, unknown> };
  const internalFields = ['_internal', 'rawData', 'scannerMeta', 'debugInfo', 'internalId', 'systemInfo', 'processInfo'];
  internalFields.forEach(field => { delete sanitized[field]; });

  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeDetails(sanitized[key]);
    }
  });

  return sanitized;
};

/**
 * Extracts domain from URL for display
 */
const getDomainFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/**
 * Gets TLS grade from evidence details
 */
const getTlsGrade = (details: unknown): 'A' | 'B' | 'C' | 'D' | 'F' | undefined => {
  if (typeof details === 'object' && details !== null) {
    const grade = (details as Record<string, unknown>).grade;
    if (grade === 'A' || grade === 'B' || grade === 'C' || grade === 'D' || grade === 'F') return grade;
  }
  return undefined;
};

/**
 * Check if value is a valid DataSharingLevel
 */
const isDataSharingLevel = (value: unknown): value is DataSharingLevel =>
  value === 'None' || value === 'Low' || value === 'Medium' || value === 'High';

/**
 * Gets domain from evidence details
 */
const getDetailDomain = (details: unknown): string => {
  if (typeof details === 'object' && details !== null) {
    const domain = (details as Record<string, unknown>).domain;
    if (typeof domain === 'string') return domain;
  }
  return '';
};

export default function ReportPageRedesigned() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery(reportQueryOptions(slug));

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (isError || !data) {
    const isSchemaError = error?.message?.includes('validation') || error?.name === 'ZodError';
    const is404Error = error?.message?.includes('Report not found');

    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            <span>&larr;</span> Home
          </Link>
        </div>
        <ErrorState
          error={error || new Error('Report not found')}
          title={isSchemaError ? 'Report Data Error' : is404Error ? 'Report Not Found' : 'Failed to Load Report'}
          description={`There was an issue loading the report "${slug}". Please try again.`}
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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <CardSkeleton className="w-20 h-8" />
      <div className="flex items-center gap-6">
        <ScoreDialSkeleton size="md" />
        <div className="flex-1 space-y-2">
          <CardSkeleton className="h-8 w-80" />
          <CardSkeleton className="h-5 w-64" />
        </div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <CardSkeleton key={i} className="w-24 h-10" />
        ))}
      </div>
      <CardSkeleton className="h-64" />
    </div>
  );
}

/**
 * Main report body with tab-based navigation
 */
function ReportBody({ slug, data }: { slug: string; data: ReportResponse }) {
  const { scan, evidence, topFixes, meta } = data;
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state - sync with URL
  const [activeTab, setActiveTab] = React.useState<TabId>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'tracking' || tabParam === 'security' || tabParam === 'cookies' || tabParam === 'details') {
      return tabParam;
    }
    return 'overview';
  });

  // Sync tab changes to URL
  React.useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (activeTab === 'overview' && currentTab) {
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    } else if (activeTab !== 'overview' && currentTab !== activeTab) {
      searchParams.set('tab', activeTab);
      setSearchParams(searchParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Computed values
  const domain = getDomainFromUrl(scan.input);
  const score = scan.score ?? 0;
  const riskLevel = getRiskLevel(score);
  const heroGlowClass = getGlowClass(riskLevel);

  // Extract domains from evidence
  const trackerDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter(e => e.kind === 'tracker').forEach(e => {
      const d = getDetailDomain(e.details);
      if (d) domains.add(d);
    });
    return Array.from(domains);
  }, [evidence]);

  const thirdPartyDomains = React.useMemo(() => {
    const domains = new Set<string>();
    evidence.filter(e => e.kind === 'thirdparty').forEach(e => {
      const d = getDetailDomain(e.details);
      if (d) domains.add(d);
    });
    return Array.from(domains);
  }, [evidence]);

  const cookieIssues = evidence.filter(e => e.kind === 'cookie').length;
  const tlsGrade = getTlsGrade(evidence.find(e => e.kind === 'tls')?.details);

  const dataSharingLevel = React.useMemo((): DataSharingLevel => {
    if (isDataSharingLevel(meta?.dataSharing)) return meta.dataSharing;
    return computeDataSharingLevel(trackerDomains.length, thirdPartyDomains.length, cookieIssues);
  }, [cookieIssues, meta?.dataSharing, thirdPartyDomains.length, trackerDomains.length]);

  // Categorized evidence
  const trackingEvidence = React.useMemo(() =>
    evidence.filter(e => e.kind === 'tracker' || e.kind === 'thirdparty' || e.kind === 'fingerprint'),
    [evidence]
  );

  const securityEvidence = React.useMemo(() =>
    evidence.filter(e => e.kind === 'tls' || e.kind === 'header' || e.kind === 'insecure' || e.kind === 'mixed-content'),
    [evidence]
  );

  const cookieEvidence = React.useMemo(() =>
    evidence.filter(e => e.kind === 'cookie'),
    [evidence]
  );

  // SEO metadata - noindex for /r/:slug, canonical to /privacy-policy/:domain
  const seoTitle = `${domain} Privacy Report: Score ${score}/100 | Gecko Advisor`;
  const seoDescription = `Privacy analysis of ${domain} - ${trackerDomains.length} trackers, Grade ${tlsGrade || 'N/A'} TLS, ${thirdPartyDomains.length} third parties. Full privacy breakdown.`;
  const canonicalUrl = `https://geckoadvisor.com/privacy-policy/${domain}`;

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'WebSite',
      name: domain,
      url: scan.input.startsWith('http') ? scan.input : `https://${scan.input}`,
    },
    author: { '@type': 'Organization', name: 'Gecko Advisor', url: 'https://geckoadvisor.com' },
    reviewRating: { '@type': 'Rating', ratingValue: score.toString(), bestRating: '100', worstRating: '0' },
    datePublished: scan.createdAt,
  };

  // Export JSON handler
  const exportJson = React.useCallback(() => {
    const payload = {
      scan: { id: scan.id, input: scan.input, score: scan.score, label: scan.label, slug },
      exportedAt: new Date().toISOString(),
      evidence: evidence.map(e => ({ ...e, details: sanitizeDetails(e.details) })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacy-report-${slug}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [evidence, scan, slug]);

  // Share handler
  const shareUrl = React.useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url });
        toast.success('Link shared!');
        return;
      } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm md:hidden">
        <div className="flex items-center justify-between p-3">
          <Link to="/" className="text-emerald-600 p-1" aria-label="Back to home">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0 mx-3">
            <div className="text-sm font-medium text-zinc-900 truncate">{domain}</div>
            <div className="text-xs text-zinc-500">{scan.label} ({score}%)</div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
            score >= 70 ? 'bg-emerald-100 text-emerald-700' :
            score >= 40 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {score}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Back Link - Desktop */}
        <div className="hidden md:block mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Report Header - Compact with risk-level glow */}
        <header
          className={`bg-gradient-to-br from-stone-50 to-white border border-gray-200 rounded-2xl p-6 md:p-8 mb-6 bg-textured animate-stagger-in ${heroGlowClass}`}
          style={{ '--stagger-index': 0 } as React.CSSProperties}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Score Dial */}
            <div className="flex-shrink-0">
              <EnhancedScoreDial score={score} size="lg" label={scan.label ?? undefined} />
            </div>

            {/* Report Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-zinc-900">
                  <span className="font-mono">{domain}</span> Privacy & Security Analysis
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                  <p className="text-zinc-600 break-all font-mono text-sm">{scan.input}</p>
                  <CopyButton text={window.location.href} />
                </div>
              </div>

              <div className="flex justify-center md:justify-start">
                <GradeBadge score={score} size="lg" showLabel={true} />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center md:justify-start gap-2 pt-2">
                <Link
                  to="/"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Scan Another
                </Link>
                <button
                  onClick={shareUrl}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-zinc-600 transition-colors"
                  title="Share"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-zinc-600 transition-colors"
                  title="Print"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                <button
                  onClick={exportJson}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-zinc-600 transition-colors"
                  title="Export JSON"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* SEO Summary - Crawlable text for search engines */}
        <section
          className="mt-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 animate-stagger-in"
          style={{ '--stagger-index': 1 } as React.CSSProperties}
        >
          <p className="leading-relaxed">
            We analyzed <strong>{domain}</strong> and found it scores <strong>{score}/100</strong> for privacy.
            {tlsGrade && <> The site has Grade <strong>{tlsGrade}</strong> TLS security.</>}
            {' '}{trackerDomains.length > 0
              ? <>{trackerDomains.length} tracker{trackerDomains.length !== 1 ? 's' : ''} detected</>
              : <>No trackers detected</>}
            {' '}and {thirdPartyDomains.length > 0
              ? <>{thirdPartyDomains.length} third-party connection{thirdPartyDomains.length !== 1 ? 's' : ''}</>
              : <>no third-party connections</>}.
            {' '}Data sharing level: <strong>{dataSharingLevel}</strong>.
          </p>
        </section>

        {/* Tab Navigation */}
        <div
          className="sticky top-0 md:top-0 z-10 bg-white -mx-4 px-4 md:mx-0 md:px-0 animate-stagger-in"
          style={{ '--stagger-index': 2 } as React.CSSProperties}
        >
          <ReportTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            evidence={evidence}
          />
        </div>

        {/* Tab Content */}
        <div
          className="mt-6 animate-stagger-in"
          style={{ '--stagger-index': 3 } as React.CSSProperties}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              score={score}
              label={scan.label}
              domain={domain}
              evidence={evidence}
              topFixes={topFixes}
              dataSharingLevel={dataSharingLevel}
              trackerCount={trackerDomains.length}
              thirdPartyCount={thirdPartyDomains.length}
              tlsGrade={tlsGrade}
              onViewDetails={() => setActiveTab('details')}
            />
          )}

          {activeTab === 'tracking' && (
            <CategoryTab
              tabId="tracking"
              title={`${domain} trackers: what's watching you`}
              description={`Who ${domain} shares your data with - trackers, fingerprinting scripts, and third-party connections.`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              }
              evidence={trackingEvidence}
              tips={CATEGORY_TIPS.tracking}
              sanitizeDetails={sanitizeDetails}
            />
          )}

          {activeTab === 'security' && (
            <CategoryTab
              tabId="security"
              title={`${domain} security analysis`}
              description={`${domain} connection security - TLS/HTTPS configuration, security headers, and potential vulnerabilities.`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              evidence={securityEvidence}
              tips={CATEGORY_TIPS.security}
              sanitizeDetails={sanitizeDetails}
            />
          )}

          {activeTab === 'cookies' && (
            <CategoryTab
              tabId="cookies"
              title={`${domain} cookie practices`}
              description={`How ${domain} uses cookies - storage patterns, tracking cookies, and data retention.`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              evidence={cookieEvidence}
              tips={CATEGORY_TIPS.cookies}
              sanitizeDetails={sanitizeDetails}
            />
          )}

          {activeTab === 'details' && (
            <AllDetailsTab
              evidence={evidence}
              sanitizeDetails={sanitizeDetails}
            />
          )}
        </div>

        {/* Footer Links */}
        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-zinc-500 space-y-2">
          <div>Sources: EasyPrivacy, WhoTracks.me (CC BY 4.0), Public Suffix List</div>
          <div className="flex flex-wrap gap-3">
            <button onClick={shareUrl} className="text-emerald-600 hover:text-emerald-700 underline">Share Link</button>
            <span>|</span>
            <a href={`/compare?left=${encodeURIComponent(slug)}`} className="text-emerald-600 hover:text-emerald-700 underline">Compare</a>
          </div>
        </footer>
      </main>

      <Footer />
    </>
  );
}

/**
 * AllDetailsTab - Complete technical breakdown
 */
function AllDetailsTab({
  evidence,
  sanitizeDetails
}: {
  evidence: EvidenceItem[];
  sanitizeDetails: (details: unknown) => unknown;
}) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  // Group evidence by kind
  const groupedEvidence = React.useMemo(() => {
    const groups: Record<string, EvidenceItem[]> = {};
    evidence.forEach(e => {
      (groups[e.kind] ??= []).push(e);
    });
    return Object.entries(groups).sort((a, b) => {
      // Sort by max severity in group
      const maxA = Math.max(...a[1].map(e => e.severity));
      const maxB = Math.max(...b[1].map(e => e.severity));
      return maxB - maxA;
    });
  }, [evidence]);

  const toggleGroup = (kind: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getCategoryLabel = (kind: string): string => {
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
    return labels[kind] || kind.charAt(0).toUpperCase() + kind.slice(1);
  };

  const getSeverityStyle = (severity: number) => {
    if (severity >= 4) return { bg: 'bg-red-50', border: 'border-l-4 border-red-400', badge: 'bg-red-100 text-red-700', label: 'Critical' };
    if (severity === 3) return { bg: 'bg-amber-50', border: 'border-l-4 border-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'High' };
    if (severity === 2) return { bg: 'bg-yellow-50', border: 'border-l-4 border-yellow-300', badge: 'bg-yellow-100 text-yellow-700', label: 'Medium' };
    return { bg: 'bg-gray-50', border: 'border-l-4 border-gray-300', badge: 'bg-gray-100 text-gray-600', label: 'Low' };
  };

  const safeStringify = (value: unknown): string => {
    try { return JSON.stringify(value, null, 2); }
    catch { return String(value); }
  };

  return (
    <div role="tabpanel" id="tabpanel-details" aria-labelledby="tab-details" className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">All Technical Details</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setExpandedGroups(new Set(groupedEvidence.map(([k]) => k)))}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Expand All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setExpandedGroups(new Set())}
            className="text-sm text-zinc-600 hover:text-zinc-700 font-medium"
          >
            Collapse All
          </button>
        </div>
      </div>

      {groupedEvidence.length === 0 ? (
        <div className="text-center py-12 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-emerald-800">No issues detected</p>
          <p className="text-emerald-700 text-sm">This website has excellent privacy practices.</p>
        </div>
      ) : (
        groupedEvidence.map(([kind, items]) => {
          const isExpanded = expandedGroups.has(kind);
          const maxSeverity = Math.max(...items.map(e => e.severity));
          const groupStyle = getSeverityStyle(maxSeverity);

          return (
            <div key={kind} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(kind)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-900">{getCategoryLabel(kind)}</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${groupStyle.badge}`}>
                    {items.length}
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                  {items.sort((a, b) => b.severity - a.severity).map(item => {
                    const style = getSeverityStyle(item.severity);
                    const isItemExpanded = expandedItems.has(item.id);
                    const sanitized = sanitizeDetails(item.details);
                    const hasDetails = Boolean(sanitized && (
                      typeof sanitized === 'string'
                        ? (sanitized as string).trim().length > 0
                        : Object.keys(sanitized as object).length > 0
                    ));

                    return (
                      <div key={item.id} className={`${style.bg} ${style.border} rounded-lg p-3`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-zinc-900 text-sm">{item.title}</span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${style.badge}`}>
                            {style.label}
                          </span>
                        </div>

                        {hasDetails && (
                          <>
                            <button
                              onClick={() => toggleItem(item.id)}
                              className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                              aria-expanded={isItemExpanded}
                            >
                              {isItemExpanded ? '- Hide details' : '+ Show details'}
                            </button>
                            {isItemExpanded && (
                              <pre className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs text-zinc-700 font-mono overflow-x-auto whitespace-pre-wrap">
                                {typeof sanitized === 'string' ? sanitized : safeStringify(sanitized as object)}
                              </pre>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Export ReportBody and ReportSkeleton for use with domain-based routes
 */
export { ReportBody, ReportSkeleton };
