/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getBlogPost, type BlogPost } from '../lib/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

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

/**
 * Simple markdown-to-HTML converter for blog content
 * Handles: headings, paragraphs, bold, italic, links, lists, code blocks, blockquotes
 *
 * IMPORTANT: All text uses high-contrast colors (zinc-800/900) for visibility
 */
function renderMarkdown(content: string): string {
  let html = content;

  // Escape HTML to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-zinc-100 rounded-lg p-4 overflow-x-auto my-6 border border-zinc-200"><code class="text-sm text-zinc-800 font-mono">${code.trim()}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 px-1.5 py-0.5 rounded text-sm text-zinc-800 font-mono border border-zinc-200">$1</code>');

  // Headings - using zinc-900 for maximum contrast
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-zinc-900 mt-8 mb-4">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-zinc-900 mt-10 mb-4">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-zinc-900 mt-10 mb-4">$1</h1>');

  // Blockquotes - using zinc-700 for better visibility
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-advisor-400 pl-4 my-6 py-2 text-zinc-700 italic bg-zinc-50 rounded-r">$1</blockquote>');

  // Bold and italic - ensuring text color is inherited properly
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold text-zinc-900"><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-zinc-900">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // Links - using advisor color with underline
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-advisor-600 hover:text-advisor-500 underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists - using zinc-800 for better visibility
  html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-6 list-disc text-zinc-800">$1</li>');

  // Ordered lists (simple) - using zinc-800 for better visibility
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal text-zinc-800">$1</li>');

  // Wrap consecutive list items
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-4 space-y-2 text-zinc-800">$1</ul>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-8 border-t border-zinc-300" />');

  // Paragraphs (lines that aren't already wrapped) - using zinc-800 for excellent readability
  const lines = html.split('\n');
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line;
    return `<p class="text-zinc-800 leading-relaxed my-4">${trimmed}</p>`;
  });
  html = processedLines.join('\n');

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*><\/p>/g, '');

  return html;
}

/**
 * BlogPostPage Component - Single Blog Post View
 *
 * Displays a full blog post with markdown rendering, SEO meta tags,
 * and Open Graph tags for social sharing.
 */
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError, error } = useQuery<BlogPost>({
    queryKey: ['blog-post', slug],
    queryFn: () => getBlogPost(slug!),
    enabled: !!slug,
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 30 * 60_000, // 30 minutes
    retry: (failureCount, err) => {
      if (err instanceof Error && err.message.includes('not found')) return false;
      return failureCount < 2;
    },
  });

  // Default SEO values
  const defaultTitle = 'Blog Post | Gecko Advisor';
  const defaultDescription = 'Read this article about online privacy and data protection on the Gecko Advisor blog.';

  // Loading State
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{defaultTitle}</title>
          <meta name="description" content={defaultDescription} />
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-advisor-500 mx-auto"></div>
              <p className="mt-4 text-zinc-600 font-medium">Loading article...</p>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // Error State
  if (isError || !post) {
    const isNotFound = error instanceof Error && error.message.includes('not found');
    return (
      <>
        <Helmet>
          <title>{isNotFound ? 'Post Not Found | Gecko Advisor' : 'Error | Gecko Advisor'}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              {isNotFound ? (
                <>
                  <svg
                    className="mx-auto h-16 w-16 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <h3 className="mt-4 text-xl font-semibold text-zinc-900">Post Not Found</h3>
                  <p className="mt-2 text-zinc-600">
                    The blog post you're looking for doesn't exist or has been removed.
                  </p>
                </>
              ) : (
                <>
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
                  <h3 className="mt-4 text-lg font-medium text-zinc-900">Failed to Load Post</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    {error instanceof Error ? error.message : 'An unexpected error occurred'}
                  </p>
                </>
              )}
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  to="/blog"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-zinc-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Back to Blog
                </Link>
                {!isNotFound && (
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-advisor-600 hover:bg-advisor-500 transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  // SEO values from post
  const seoTitle = post.metaTitle || `${post.title} | Gecko Advisor Blog`;
  const seoDescription = post.metaDescription || post.excerpt;
  const canonicalUrl = `https://geckoadvisor.com/blog/${post.slug}`;

  // Structured data for article
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
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
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    ...(post.coverImage && { image: post.coverImage }),
  };

  // Success State - Display Blog Post
  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        {post.coverImage && <meta property="og:image" content={post.coverImage} />}
        {post.publishedAt && <meta property="article:published_time" content={post.publishedAt} />}
        <meta property="article:modified_time" content={post.updatedAt} />

        {/* Twitter Card */}
        <meta name="twitter:card" content={post.coverImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {post.coverImage && <meta name="twitter:image" content={post.coverImage} />}

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          <article className="container mx-auto px-4 py-8 max-w-2xl">
            {/* Navigation Links */}
            <nav className="mb-8">
              <Link
                to="/blog"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-advisor-600 bg-gray-50 hover:bg-advisor-50 border border-gray-200 hover:border-advisor-300 rounded-full transition-all duration-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Blog
              </Link>
            </nav>

            {/* Article Header */}
            <header className="mb-8">
              {/* Meta */}
              <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4">
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
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4 leading-tight">
                {post.title}
              </h1>

              {/* Excerpt */}
              <p className="text-lg text-zinc-600 leading-relaxed">
                {post.excerpt}
              </p>
            </header>

            {/* Cover Image */}
            {post.coverImage && (
              <figure className="mb-8 -mx-4 sm:mx-0">
                <img
                  src={post.coverImage}
                  alt=""
                  className="w-full rounded-lg shadow-lg"
                  loading="eager"
                />
              </figure>
            )}

            {/* Article Content */}
            <div
              className="prose prose-zinc max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />

            {/* Article Footer */}
            <footer className="mt-12 pt-8 border-t border-zinc-200">
              {/* Share Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-500">
                    Last updated: {formatDate(post.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500 mr-2">Share:</span>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(canonicalUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
                    aria-label="Share on Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
                    aria-label="Share on LinkedIn"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
            </footer>
          </article>

          {/* Related CTA */}
          <div className="container mx-auto px-4 pb-12 max-w-2xl">
            <div className="bg-stone-50 rounded-2xl shadow-lg p-8 border border-gray-200 text-center">
              <h2 className="text-xl font-bold text-zinc-900 mb-2">
                Ready to check your privacy?
              </h2>
              <p className="text-zinc-600 mb-6">
                Use our free scanner to analyze any website for trackers and privacy issues.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-advisor-600 hover:bg-advisor-500 transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                <Link
                  to="/blog"
                  className="inline-flex items-center px-5 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-zinc-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Read More Posts
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
