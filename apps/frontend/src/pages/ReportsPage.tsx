/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPaginatedReports, type PaginatedReportsResponse } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Card from '../components/Card';
import GradeBadge from '../components/GradeBadge';

/**
 * Helper function for converting dates to relative time strings
 * @param value - Date object or ISO string
 * @returns Human-readable relative time string
 */
const getRelativeTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ITEMS_PER_PAGE = 12;

/**
 * ReportsPage Component - Recent Privacy Scans Listing with Pagination
 *
 * A comprehensive page that displays all publicly available privacy scans
 * from the community with bottom pagination.
 */
export default function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const { data, isLoading, isError, error } = useQuery<PaginatedReportsResponse>({
    queryKey: ['reports-paginated', currentPage],
    queryFn: () => getPaginatedReports(currentPage, ITEMS_PER_PAGE),
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-advisor-500 mx-auto"></div>
            <p className="mt-4 text-zinc-600 font-medium">Loading recent scans...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <svg
              className="mx-auto h-12 w-12 text-score-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900">Failed to Load Scans</h3>
            <p className="mt-2 text-sm text-zinc-600">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-dark-bg bg-advisor-500 hover:bg-advisor-400 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Empty State
  if (items.length === 0 && currentPage === 1) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
                Recent Privacy Scans
              </h1>
              <p className="mt-2 text-zinc-600">
                Browse all publicly available privacy scans from our community
              </p>
            </div>

            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-zinc-900">No scans yet</h3>
              <p className="mt-2 text-sm text-zinc-600">
                Get started by scanning your first website.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-dark-bg bg-advisor-500 hover:bg-advisor-400 transition-colors"
                >
                  Start a Scan
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Success State - Display Reports
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
              Recent Privacy Scans
            </h1>
            <p className="mt-2 text-zinc-600">
              Browse all publicly available privacy scans from our community
            </p>
          </div>

          {/* Stats Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-zinc-600">
              Showing <span className="font-semibold text-zinc-900">{items.length}</span> of{' '}
              <span className="font-semibold text-zinc-900">{pagination?.totalCount || 0}</span> scans
              {pagination && pagination.totalPages > 1 && (
                <span className="ml-2">
                  (Page {pagination.page} of {pagination.totalPages})
                </span>
              )}
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((report) => {
              const domain = report.domain;

              return (
                <div
                  key={report.slug}
                  onClick={() => navigate(`/r/${report.slug}`)}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/r/${report.slug}`);
                    }
                  }}
                  aria-label={`View privacy report for ${domain}`}
                >
                  <Card className="hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Domain + favicon */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded bg-white flex items-center justify-center overflow-hidden">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                            alt=""
                            width="24"
                            height="24"
                            className="rounded"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-zinc-900 truncate" title={domain}>
                            {domain}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {getRelativeTime(report.createdAt)} • {report.evidenceCount} checks
                          </p>
                        </div>
                      </div>

                      {/* Right: Grade badge */}
                      <div className="flex-shrink-0">
                        <GradeBadge score={report.score} size="md" showLabel={false} />
                      </div>
                    </div>

                    {/* View report button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/r/${report.slug}`);
                      }}
                      className="mt-4 w-full text-center px-4 py-2 bg-white hover:bg-gray-100 rounded-lg text-sm font-medium text-zinc-900 transition-colors"
                      aria-label={`View privacy report for ${domain}`}
                    >
                      View Report →
                    </button>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  pagination.hasPrevPage
                    ? 'border-gray-300 bg-white text-zinc-700 hover:bg-gray-50 hover:border-advisor-400'
                    : 'border-gray-200 bg-gray-100 text-zinc-400 cursor-not-allowed'
                }`}
                aria-label="Go to previous page"
              >
                ← Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {generatePageNumbers(currentPage, pagination.totalPages).map((pageNum, index) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-zinc-400">
                        ...
                      </span>
                    );
                  }
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum as number)}
                      className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-advisor-500 text-white shadow-md'
                          : 'border border-gray-300 bg-white text-zinc-700 hover:bg-gray-50 hover:border-advisor-400'
                      }`}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  pagination.hasNextPage
                    ? 'border-gray-300 bg-white text-zinc-700 hover:bg-gray-50 hover:border-advisor-400'
                    : 'border-gray-200 bg-gray-100 text-zinc-400 cursor-not-allowed'
                }`}
                aria-label="Go to next page"
              >
                Next →
              </button>
            </nav>
          )}

          {/* Call to Action */}
          <div className="mt-12 text-center bg-stone-50 rounded-2xl shadow-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">
              Want to scan your own site?
            </h2>
            <p className="text-zinc-600 mb-6 max-w-2xl mx-auto">
              Use our privacy scanner to analyze any website for trackers, cookies, and security issues. Get a detailed report in seconds.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-dark-bg bg-advisor-500 hover:bg-advisor-400 active:bg-advisor-600 transition-all duration-200"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Start a New Scan
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/**
 * Generate page numbers for pagination with ellipsis for large page counts
 */
function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const delta = 2; // Number of pages to show on each side of current page

  // Always show first page
  pages.push(1);

  // Calculate range around current page
  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  // Add ellipsis after first page if needed
  if (rangeStart > 2) {
    pages.push('...');
  }

  // Add pages in range
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (rangeEnd < totalPages - 1) {
    pages.push('...');
  }

  // Always show last page (if more than 1 page)
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}
