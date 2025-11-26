/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getBlogPosts, type PaginatedBlogPostsResponse } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Card from '../components/Card';
import BackToHome from '../components/BackToHome';

/**
 * Format date to a readable string
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const ITEMS_PER_PAGE = 9;

/**
 * BlogListPage Component - Blog Posts Listing with Pagination
 *
 * Displays all published blog posts with pagination, cover images,
 * excerpts, and reading time estimates.
 */
export default function BlogListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const { data, isLoading, isError, error } = useQuery<PaginatedBlogPostsResponse>({
    queryKey: ['blog-posts', currentPage],
    queryFn: () => getBlogPosts(currentPage, ITEMS_PER_PAGE),
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 15 * 60_000, // 15 minutes
  });

  const posts = data?.items ?? [];
  const pagination = data?.pagination;

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // SEO Meta Tags
  const seoTitle = 'Privacy Blog | Gecko Advisor';
  const seoDescription = 'Stay informed about online privacy, data protection, and security best practices. Read our latest articles on protecting your digital footprint.';

  // Loading State
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{seoTitle}</title>
          <meta name="description" content={seoDescription} />
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-advisor-500 mx-auto"></div>
              <p className="mt-4 text-zinc-600 font-medium">Loading blog posts...</p>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // Error State
  if (isError) {
    return (
      <>
        <Helmet>
          <title>{seoTitle}</title>
          <meta name="description" content={seoDescription} />
        </Helmet>
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
              <h3 className="mt-4 text-lg font-medium text-zinc-900">Failed to Load Blog</h3>
              <p className="mt-2 text-sm text-zinc-600">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-advisor-600 hover:bg-advisor-500 transition-colors"
              >
                Try Again
              </button>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // Empty State
  if (posts.length === 0 && currentPage === 1) {
    return (
      <>
        <Helmet>
          <title>{seoTitle}</title>
          <meta name="description" content={seoDescription} />
          <meta property="og:title" content={seoTitle} />
          <meta property="og:description" content={seoDescription} />
          <meta property="og:type" content="website" />
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
                  Privacy Blog
                </h1>
                <p className="mt-2 text-zinc-600">
                  Insights, guides, and news about online privacy and data protection
                </p>
              </div>

              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-zinc-900">No posts yet</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Check back soon for new privacy insights and guides.
                </p>
                <div className="mt-6">
                  <Link
                    to="/"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-advisor-600 hover:bg-advisor-500 transition-colors"
                  >
                    Scan a Website
                  </Link>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // Success State - Display Blog Posts
  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <link rel="canonical" href={`https://geckoadvisor.com/blog${currentPage > 1 ? `?page=${currentPage}` : ''}`} />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back to Home */}
            <BackToHome />

            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900">
                Privacy Blog
              </h1>
              <p className="mt-2 text-zinc-600">
                Insights, guides, and news about online privacy and data protection
              </p>
            </div>

            {/* Stats Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-zinc-600">
                Showing <span className="font-semibold text-zinc-900">{posts.length}</span> of{' '}
                <span className="font-semibold text-zinc-900">{pagination?.totalCount || 0}</span> posts
                {pagination && pagination.totalPages > 1 && (
                  <span className="ml-2">
                    (Page {pagination.page} of {pagination.totalPages})
                  </span>
                )}
              </div>
            </div>

            {/* Blog Posts Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="cursor-pointer group"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/blog/${post.slug}`);
                    }
                  }}
                  aria-label={`Read article: ${post.title}`}
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-200 group-hover:-translate-y-1">
                    {/* Cover Image or Placeholder */}
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg -mx-4 -mt-4 mb-4">
                      {post.coverImage ? (
                        <img
                          src={post.coverImage}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-advisor-100 to-advisor-200 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                          <div className="text-center">
                            <svg
                              className="w-12 h-12 text-advisor-400 mx-auto mb-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-advisor-500 text-sm font-medium">Privacy Insights</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1">
                      {/* Meta */}
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        {post.publishedAt && (
                          <time dateTime={post.publishedAt}>
                            {formatDate(post.publishedAt)}
                          </time>
                        )}
                        {post.publishedAt && post.readTimeMinutes && (
                          <span aria-hidden="true">-</span>
                        )}
                        {post.readTimeMinutes && (
                          <span>{post.readTimeMinutes} min read</span>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-semibold text-zinc-900 mb-2 line-clamp-2 group-hover:text-advisor-600 transition-colors">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm text-zinc-600 line-clamp-3 flex-1">
                        {post.excerpt}
                      </p>

                      {/* Read More Link */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <span className="text-sm font-medium text-advisor-600 group-hover:text-advisor-500 transition-colors inline-flex items-center gap-1">
                          Read more
                          <svg
                            className="w-4 h-4 transition-transform group-hover:translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Card>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Blog pagination">
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
                  Previous
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
                  Next
                </button>
              </nav>
            )}

            {/* Call to Action */}
            <div className="mt-12 text-center bg-stone-50 rounded-2xl shadow-lg p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                Check your website's privacy
              </h2>
              <p className="text-zinc-600 mb-6 max-w-2xl mx-auto">
                Use our free scanner to analyze any website for trackers, cookies, and privacy issues. Get a detailed report in seconds.
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-advisor-600 hover:bg-advisor-500 active:bg-advisor-700 transition-all duration-200"
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
                Scan a Website
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

/**
 * Generate page numbers for pagination with ellipsis for large page counts
 */
function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const delta = 2;

  pages.push(1);

  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  if (rangeStart > 2) {
    pages.push('...');
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < totalPages - 1) {
    pages.push('...');
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}
