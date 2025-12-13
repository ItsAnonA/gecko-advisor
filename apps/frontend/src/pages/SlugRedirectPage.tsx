/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { reportQueryOptions } from '../lib/api';

/**
 * Extracts domain from URL for redirect
 */
function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * SlugRedirectPage - Redirects /r/:slug to /privacy-policy/:domain
 *
 * This maintains backwards compatibility for shared short URLs
 * while ensuring users land on the SEO-friendly canonical URL.
 *
 * Flow:
 * 1. Fetch report by slug to get the domain
 * 2. Redirect to /privacy-policy/:domain (preserving query params)
 */
export default function SlugRedirectPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    ...reportQueryOptions(slug),
    // Only need minimal data for redirect
    staleTime: Infinity, // Use cached data if available
  });

  // Loading state - minimal spinner while we fetch domain
  if (isLoading) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-3 text-zinc-500 text-sm">Redirecting...</p>
          </div>
        </div>
      </>
    );
  }

  // If report not found, redirect to home with error
  if (error || !data) {
    return <Navigate to="/" replace />;
  }

  // Extract domain and redirect to canonical URL
  const domain = getDomainFromUrl(data.scan.input);

  // Preserve query params (like ?tab=tracking)
  const searchParams = new URLSearchParams(window.location.search);
  const queryString = searchParams.toString();
  const redirectUrl = `/privacy-policy/${domain}${queryString ? `?${queryString}` : ''}`;

  return <Navigate to={redirectUrl} replace />;
}
