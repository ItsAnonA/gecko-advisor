/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { trackJourneyEvent, trackJourneyEvents, type JourneyEvent } from '@/lib/api';

/**
 * Generate a session ID for tracking
 * Uses localStorage to persist across page loads within a session
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  const storageKey = 'gecko_session_id';
  const sessionExpiry = 'gecko_session_expiry';
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  // Check if session is still valid
  const existingExpiry = localStorage.getItem(sessionExpiry);
  const existingId = localStorage.getItem(storageKey);

  if (existingId && existingExpiry && parseInt(existingExpiry, 10) > now) {
    // Extend session expiry
    localStorage.setItem(sessionExpiry, String(now + thirtyMinutes));
    return existingId;
  }

  // Create new session
  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(storageKey, newId);
  localStorage.setItem(sessionExpiry, String(now + thirtyMinutes));
  return newId;
}

/**
 * JourneyTracker - Tracks user engagement for analytics
 *
 * Tracks:
 * - Page views on route changes
 * - Scroll depth (25%, 50%, 75%, 100%)
 * - Time on page
 * - Tab switches and interactions
 *
 * Batches events and sends every 5 seconds + on page unload
 */
export default function JourneyTracker() {
  const pathname = usePathname();
  const sessionId = useRef<string>('');
  const eventQueue = useRef<JourneyEvent[]>([]);
  const pageLoadTime = useRef<number>(Date.now());
  const scrollMilestones = useRef<Set<number>>(new Set());
  const lastPathname = useRef<string>('');

  // Initialize session ID
  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  // Flush event queue
  const flushEvents = useCallback(() => {
    if (eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];
    trackJourneyEvents(events);
  }, []);

  // Add event to queue
  const queueEvent = useCallback((
    type: JourneyEvent['type'],
    data?: JourneyEvent['data']
  ) => {
    if (!sessionId.current) return;

    eventQueue.current.push({
      type,
      page: pathname,
      sessionId: sessionId.current,
      timestamp: Date.now(),
      data,
    });

    // If queue is getting large, flush immediately
    if (eventQueue.current.length >= 10) {
      flushEvents();
    }
  }, [pathname, flushEvents]);

  // Track page views on route change
  useEffect(() => {
    if (!sessionId.current) return;
    if (pathname === lastPathname.current) return;

    // Track time on previous page
    if (lastPathname.current) {
      const timeOnPage = Date.now() - pageLoadTime.current;
      queueEvent('page_view', {
        referrer: lastPathname.current,
        timeOnPage,
      });
    } else {
      // First page view
      queueEvent('page_view', {
        referrer: document.referrer || undefined,
      });
    }

    // Reset for new page
    lastPathname.current = pathname;
    pageLoadTime.current = Date.now();
    scrollMilestones.current.clear();
  }, [pathname, queueEvent]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      // Track milestones: 25%, 50%, 75%, 100%
      const milestones = [25, 50, 75, 100];
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone);
          queueEvent('scroll', { scrollDepth: milestone });
        }
      }
    };

    // Throttle scroll handler
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [queueEvent]);

  // Periodic flush every 5 seconds
  useEffect(() => {
    const interval = setInterval(flushEvents, 5000);
    return () => clearInterval(interval);
  }, [flushEvents]);

  // Flush on page unload
  useEffect(() => {
    const handleUnload = () => {
      // Track final time on page
      const timeOnPage = Date.now() - pageLoadTime.current;
      trackJourneyEvent({
        type: 'navigation',
        page: pathname,
        sessionId: sessionId.current,
        timestamp: Date.now(),
        data: {
          timeOnPage,
          referrer: pathname,
        },
      });

      // Flush remaining events
      if (eventQueue.current.length > 0) {
        trackJourneyEvents(eventQueue.current);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [pathname]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook for tracking custom interactions
 * Use this to track tab switches, expand/collapse, share clicks, etc.
 */
export function useJourneyTracker() {
  const pathname = usePathname();

  const trackInteraction = useCallback((element: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackJourneyEvent({
      type: 'interaction',
      page: pathname,
      sessionId,
      timestamp: Date.now(),
      data: { element },
    });
  }, [pathname]);

  const trackTabSwitch = useCallback((tabName: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackJourneyEvent({
      type: 'tab_switch',
      page: pathname,
      sessionId,
      timestamp: Date.now(),
      data: { element: tabName },
    });
  }, [pathname]);

  const trackExpand = useCallback((element: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackJourneyEvent({
      type: 'expand',
      page: pathname,
      sessionId,
      timestamp: Date.now(),
      data: { element },
    });
  }, [pathname]);

  const trackShare = useCallback((element: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackJourneyEvent({
      type: 'share',
      page: pathname,
      sessionId,
      timestamp: Date.now(),
      data: { element },
    });
  }, [pathname]);

  const trackSearch = useCallback((query: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackJourneyEvent({
      type: 'search',
      page: pathname,
      sessionId,
      timestamp: Date.now(),
      data: { searchQuery: query },
    });
  }, [pathname]);

  const trackNavigation = useCallback((targetPage: string) => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    trackJourneyEvent({
      type: 'navigation',
      page: pathname,
      sessionId,
      timestamp: Date.now(),
      data: { targetPage, referrer: pathname },
    });
  }, [pathname]);

  return {
    trackInteraction,
    trackTabSwitch,
    trackExpand,
    trackShare,
    trackSearch,
    trackNavigation,
  };
}
