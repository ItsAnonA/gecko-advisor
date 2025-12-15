/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Variant of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Additional CSS classes */
  className?: string;
  /** Animation type */
  animation?: 'pulse' | 'wave' | 'none';
  /** Number of lines for text variant */
  lines?: number;
}

/**
 * Skeleton component for loading states
 */
const Skeleton = React.memo(function Skeleton({
  width = '100%',
  height = '1rem',
  variant = 'text',
  className = '',
  animation = 'pulse',
  lines = 1
}: SkeletonProps) {
  const baseClasses = clsx(
    'bg-stone-50',
    {
      'animate-pulse': animation === 'pulse',
      'animate-bounce': animation === 'wave',
      'rounded-full': variant === 'circular',
      'rounded': variant === 'rounded',
      'rounded-none': variant === 'rectangular',
      'rounded-sm': variant === 'text'
    },
    className
  );

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div
        role="status"
        aria-label="Loading content"
        className="space-y-2"
        data-testid="skeleton-text-multiline"
      >
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={clsx(baseClasses, {
              'w-3/4': index === lines - 1 && lines > 1
            })}
            style={{
              ...style,
              width: index === lines - 1 && lines > 1 ? '75%' : style.width
            }}
          />
        ))}
        <span className="sr-only">Loading content...</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={baseClasses}
      style={style}
      data-testid={`skeleton-${variant}`}
    >
      <span className="sr-only">Loading content...</span>
    </div>
  );
});

/**
 * Skeleton for progress indicators
 */
export const ProgressSkeleton = React.memo(function ProgressSkeleton({
  className = ''
}: {
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <Skeleton variant="circular" width={100} height={100} />
      <div className="text-center space-y-2">
        <Skeleton width={200} height={16} variant="text" />
        <div className="flex items-center gap-4">
          <Skeleton width={120} height={14} variant="rounded" />
          <Skeleton width={120} height={14} variant="rounded" />
          <Skeleton width={120} height={14} variant="rounded" />
        </div>
      </div>
    </div>
  );
});

export default Skeleton;
