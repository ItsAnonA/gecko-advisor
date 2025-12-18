/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SEO_CONSTANTS } from '@gecko-advisor/shared';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Blog | Gecko Advisor',
  description:
    'Stay informed about online privacy, data protection, and security best practices. Read our latest articles on protecting your digital footprint.',
  alternates: {
    canonical: `${SEO_CONSTANTS.BASE_URL}/blog`,
  },
  openGraph: {
    title: `Privacy Blog | ${SEO_CONSTANTS.SITE_NAME}`,
    description:
      'Stay informed about online privacy, data protection, and security best practices.',
    url: `${SEO_CONSTANTS.BASE_URL}/blog`,
    siteName: SEO_CONSTANTS.SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Blog | Gecko Advisor',
    description:
      'Stay informed about online privacy, data protection, and security best practices.',
  },
};

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string | null;
  readTimeMinutes: number | null;
}

interface BlogPostsResponse {
  items: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

async function getBlogPosts(): Promise<BlogPostsResponse> {
  const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:5000';
  const res = await fetch(`${apiUrl}/api/v2/blog/posts?page=1&limit=20`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!res.ok) {
    throw new Error('Failed to fetch blog posts');
  }

  return res.json();
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  let error: string | null = null;

  try {
    const data = await getBlogPosts();
    posts = data.items;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load blog posts';
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blog' },
        ]}
      />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gecko-800">Privacy Blog</h1>
        <p className="mt-2 text-gecko-600">
          Insights, guides, and news about online privacy and data protection
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!error && posts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-soft">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-advisor-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gecko-800 mb-3">No Posts Yet</h2>
          <p className="text-gecko-600 max-w-md mx-auto">
            Check back soon for privacy insights and guides.
          </p>
        </div>
      )}

      {/* Blog Posts Grid */}
      {!error && posts.length > 0 && (
        <>
          {/* Stats */}
          <div className="mb-6 text-sm text-gecko-600">
            Showing <span className="font-semibold text-gecko-800">{posts.length}</span> articles
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <article className="h-full bg-white rounded-2xl border border-gray-200 shadow-soft hover:shadow-xl transition-all duration-200 group-hover:-translate-y-1 overflow-hidden">
                  {/* Cover Image */}
                  <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-advisor-100 to-advisor-200">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt=""
                        width={400}
                        height={225}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-advisor-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {/* Meta */}
                    <div className="flex items-center gap-2 text-xs text-gecko-500 mb-2">
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
                    <h2 className="text-lg font-semibold text-gecko-800 mb-2 line-clamp-2 group-hover:text-advisor-600 transition-colors">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-sm text-gecko-600 line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>

                    {/* Read More */}
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
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Call to Action */}
      <div className="mt-12 text-center bg-stone-50 rounded-2xl shadow-lg p-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gecko-800 mb-2">
          Check your website&apos;s privacy
        </h2>
        <p className="text-gecko-600 mb-6 max-w-2xl mx-auto">
          Use our free scanner to analyze any website for trackers, cookies, and privacy issues. Get
          a detailed report in seconds.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-advisor-600 hover:bg-advisor-500 active:bg-advisor-700 transition-all duration-200"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
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
  );
}
