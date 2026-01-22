/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

import Link from 'next/link';

/**
 * Category icons mapping
 */
const CATEGORY_ICONS: Record<string, string> = {
  streaming: '🎬',
  ecommerce: '🛒',
  saas: '💼',
  news: '📰',
};

/**
 * Props for the CategoryBadge component
 */
interface CategoryBadgeProps {
  /** Category slug */
  slug: string;
  /** Category display name */
  name: string;
  /** Visual size variant */
  size?: 'sm' | 'md';
  /** Optional CSS class names */
  className?: string;
}

/**
 * CategoryBadge - Displays a category badge with link to hub page
 *
 * Shows the category name with an icon and links to the category
 * benchmarks page for SEO internal linking.
 */
export function CategoryBadge({
  slug,
  name,
  size = 'md',
  className = '',
}: CategoryBadgeProps) {
  const icon = CATEGORY_ICONS[slug] || '📊';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  return (
    <Link
      href={`/privacy-benchmarks/${slug}`}
      className={`
        inline-flex items-center rounded-full font-medium
        bg-sky-50 text-sky-700 border border-sky-200
        hover:bg-sky-100 hover:border-sky-300 transition-colors
        ${sizeClasses[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      title={`View ${name} privacy benchmarks`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{name}</span>
    </Link>
  );
}

export default CategoryBadge;
