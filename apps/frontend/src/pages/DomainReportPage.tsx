/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { useParams, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { domainReportQueryOptions } from '../lib/api';

/**
 * DomainReportPage - SEO-optimized canonical page for /privacy-policy/:domain
 *
 * This page:
 * 1. Fetches report by domain name (not slug)
 * 2. Sets proper SEO meta tags with domain in title
 * 3. Has canonical URL pointing to itself
 * 4. Includes JSON-LD structured data
 * 5. Redirects to full interactive report for detailed view
 */
export default function DomainReportPage() {
  const { domain } = useParams<{ domain: string }>();

  const { data, isLoading, error } = useQuery(
    domainReportQueryOptions(domain ?? '')
  );

  // Loading state
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Loading Privacy Report... | Gecko Advisor</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-4 text-slate-400">Loading privacy report...</p>
          </div>
        </div>
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
            <div className="text-6xl mb-4">?</div>
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

  // Redirect to the full interactive report
  // The canonical /privacy-policy/:domain route serves SSR for crawlers,
  // but for users with JS, we redirect to the full React app
  return <Navigate to={`/r/${data.scan.slug}`} replace />;
}
