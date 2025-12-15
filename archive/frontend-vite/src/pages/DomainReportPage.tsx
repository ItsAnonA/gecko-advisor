/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { domainReportQueryOptions, type DomainReportResponse } from '../lib/api';
import { ReportBody, ReportSkeleton } from './ReportPageRedesigned';
import type { ReportResponse } from '@gecko-advisor/shared';

type IssueSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Maps severity string to valid IssueSeverity type
 */
function mapSeverity(severity: string): IssueSeverity {
  const validSeverities: IssueSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
  const lower = severity.toLowerCase();
  if (validSeverities.includes(lower as IssueSeverity)) {
    return lower as IssueSeverity;
  }
  return 'info';
}

/**
 * Transforms DomainReportResponse to ReportResponse format
 * Fills in missing required fields with defaults
 */
function transformToReportResponse(data: DomainReportResponse): ReportResponse {
  const scanId = data.scan.id;
  const createdAt = data.scan.createdAt;

  return {
    scan: {
      id: data.scan.id,
      targetType: 'url', // Default targetType for domain scans
      input: data.scan.input,
      normalizedInput: data.scan.normalizedInput,
      slug: data.scan.slug,
      status: data.scan.status,
      score: data.scan.score,
      label: data.scan.label,
      summary: data.scan.summary,
      createdAt: data.scan.createdAt,
      finishedAt: data.scan.finishedAt,
    },
    evidence: data.evidence.map(e => ({
      id: e.id,
      scanId: scanId, // Add required scanId
      kind: e.kind as ReportResponse['evidence'][number]['kind'],
      severity: e.severity,
      title: e.title,
      details: e.details,
      createdAt: createdAt, // Add required createdAt
    })),
    issues: data.issues.map(issue => ({
      id: issue.id,
      key: issue.key,
      category: issue.category,
      severity: mapSeverity(issue.severity),
      title: issue.title,
      summary: issue.summary,
      howToFix: issue.howToFix,
      whyItMatters: issue.whyItMatters,
      references: [], // Issues from domain API don't include references
    })),
    topFixes: data.topFixes.map(fix => ({
      id: fix.id,
      key: fix.key,
      title: fix.title,
      category: fix.category,
      severity: mapSeverity(fix.severity),
      howToFix: fix.howToFix,
      whyItMatters: fix.whyItMatters,
      references: [], // TopFixes from domain API don't include references
    })),
    meta: {
      dataSharing: data.meta.dataSharing,
      domain: data.meta.domain,
    },
  };
}

/**
 * DomainReportPage - SEO-optimized canonical page for /privacy-policy/:domain
 *
 * This page:
 * 1. Fetches report by domain name (not slug)
 * 2. Sets proper SEO meta tags with domain in title
 * 3. Has canonical URL pointing to itself
 * 4. Includes JSON-LD structured data
 * 5. Renders the full interactive report (primary URL for users)
 */
export default function DomainReportPage() {
  const { domain } = useParams<{ domain: string }>();

  const { data, isLoading, error } = useQuery(
    domainReportQueryOptions(domain ?? '')
  );

  // Loading state with SEO-friendly placeholder
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{domain ? `${domain} Privacy Report | Gecko Advisor` : 'Loading Privacy Report... | Gecko Advisor'}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <ReportSkeleton />
      </>
    );
  }

  // Error state - domain not scanned
  if (error || !data) {
    return (
      <>
        <Helmet>
          <title>Privacy Report Not Found | Gecko Advisor</title>
          <meta name="robots" content="noindex" />
          <meta name="description" content={`No privacy report found for ${domain}. Scan it now with Gecko Advisor.`} />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-white mb-2">No Report Found</h1>
            <p className="text-slate-400 mb-6">
              We haven't scanned <strong className="text-white">{domain}</strong> yet.
            </p>
            <Link
              to={`/?url=https://${domain}`}
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Scan {domain} Now
            </Link>
            <Link
              to="/"
              className="block mt-4 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Transform domain response to report response format
  const reportData = transformToReportResponse(data);

  // Render the full report using the shared ReportBody component
  return <ReportBody slug={data.scan.slug} data={reportData} />;
}
