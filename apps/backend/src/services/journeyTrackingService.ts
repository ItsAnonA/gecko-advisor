// SPDX-License-Identifier: MIT
import { redis, CacheService } from '../cache.js';
import { logger } from '../logger.js';

/**
 * Journey event types for tracking user engagement
 */
export type JourneyEventType =
  | 'page_view'
  | 'scroll'
  | 'interaction'
  | 'search'
  | 'navigation'
  | 'tab_switch'
  | 'expand'
  | 'share';

/**
 * Journey event data structure
 */
export interface JourneyEvent {
  type: JourneyEventType;
  page: string;
  sessionId: string;
  timestamp: number;
  data?: {
    scrollDepth?: number; // 25, 50, 75, 100
    targetPage?: string; // For navigation events
    timeOnPage?: number; // Milliseconds
    element?: string; // For interaction events (tab name, accordion, etc.)
    searchQuery?: string; // For search events
    referrer?: string; // Previous page
  };
}

/**
 * Aggregated journey metrics for analytics
 */
export interface JourneyMetrics {
  range: '24h' | '7d' | '30d';
  totalEvents: number;
  uniqueSessions: number;
  pageViews: number;
  averageTimeOnPage: number; // milliseconds
  journeyVelocity: number; // % of sessions with 2+ page views
  scrollDepthDistribution: {
    '25': number;
    '50': number;
    '75': number;
    '100': number;
  };
  delayedInteractionRate: number; // % with interactions after 10s
  topPages: Array<{ page: string; views: number }>;
  topInteractions: Array<{ element: string; count: number }>;
  searchCount: number;
  navigationPaths: Array<{ from: string; to: string; count: number }>;
}

/**
 * Redis Stream keys and configuration
 */
const JOURNEY_STREAM_KEY = 'journey:events';
const JOURNEY_METRICS_PREFIX = 'journey:metrics';
const JOURNEY_SESSION_PREFIX = 'journey:session';

// Stream retention: ~7 days worth of events (trim by count approximation)
const STREAM_MAX_LENGTH = 100000;

// Metrics cache TTL: 5 minutes for real-time, longer for historical
const METRICS_CACHE_TTL = {
  '24h': 300, // 5 minutes
  '7d': 900, // 15 minutes
  '30d': 3600, // 1 hour
};

/**
 * Service for tracking user journey events and calculating engagement metrics
 * Uses Redis Streams for event storage with automatic trimming
 */
export class JourneyTrackingService {
  /**
   * Track a journey event (fire-and-forget)
   * Events are added to a Redis Stream for later processing
   */
  async trackEvent(event: JourneyEvent): Promise<void> {
    try {
      // Validate event
      if (!event.sessionId || !event.type || !event.page) {
        logger.warn({ event }, 'Invalid journey event - missing required fields');
        return;
      }

      // Serialize event data for Redis Stream
      const fields: Record<string, string> = {
        type: event.type,
        page: event.page,
        sessionId: event.sessionId,
        timestamp: event.timestamp.toString(),
      };

      // Add optional data fields
      if (event.data) {
        if (event.data.scrollDepth !== undefined) {
          fields.scrollDepth = event.data.scrollDepth.toString();
        }
        if (event.data.targetPage) {
          fields.targetPage = event.data.targetPage;
        }
        if (event.data.timeOnPage !== undefined) {
          fields.timeOnPage = event.data.timeOnPage.toString();
        }
        if (event.data.element) {
          fields.element = event.data.element;
        }
        if (event.data.searchQuery) {
          fields.searchQuery = event.data.searchQuery;
        }
        if (event.data.referrer) {
          fields.referrer = event.data.referrer;
        }
      }

      // Add to stream with automatic trimming
      // XADD key MAXLEN ~ count * fields
      const fieldArray = Object.entries(fields).flat();
      await redis.xadd(
        JOURNEY_STREAM_KEY,
        'MAXLEN',
        '~',
        STREAM_MAX_LENGTH.toString(),
        '*',
        ...fieldArray
      );

      // Update session tracking for journey velocity calculation
      await this.updateSessionTracking(event.sessionId, event.page, event.timestamp);

      logger.debug({ eventType: event.type, page: event.page }, 'Journey event tracked');
    } catch (error) {
      // Fire-and-forget - log error but don't throw
      logger.warn({ error, event }, 'Failed to track journey event');
    }
  }

  /**
   * Track session activity for journey velocity calculation
   * Stores unique pages visited per session
   */
  private async updateSessionTracking(
    sessionId: string,
    page: string,
    timestamp: number
  ): Promise<void> {
    const sessionKey = `${JOURNEY_SESSION_PREFIX}:${sessionId}`;

    try {
      // Add page to session's visited pages set
      await redis.sadd(sessionKey, page);

      // Set expiry on session key (24 hours)
      await redis.expire(sessionKey, 86400);

      // Track first visit timestamp for delayed interaction calculation
      const firstVisitKey = `${sessionKey}:first`;
      const exists = await redis.exists(firstVisitKey);
      if (!exists) {
        await redis.setex(firstVisitKey, 86400, timestamp.toString());
      }
    } catch (error) {
      logger.warn({ error, sessionId }, 'Failed to update session tracking');
    }
  }

  /**
   * Get aggregated journey metrics for a time range
   * Results are cached to avoid expensive stream reads
   */
  async getMetrics(range: '24h' | '7d' | '30d'): Promise<JourneyMetrics> {
    const cacheKey = `${JOURNEY_METRICS_PREFIX}:${range}`;
    const cacheTtl = METRICS_CACHE_TTL[range];

    return CacheService.getOrSet(cacheKey, () => this.calculateMetrics(range), cacheTtl);
  }

  /**
   * Calculate metrics from raw event stream
   */
  private async calculateMetrics(range: '24h' | '7d' | '30d'): Promise<JourneyMetrics> {
    const now = Date.now();
    const rangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const startTime = now - rangeMs[range];

    try {
      // Read events from stream within time range
      // Use XRANGE with - + to get all, then filter by timestamp
      // For production scale, consider XREAD with consumer groups
      const events = await this.readEventsInRange(startTime, now);

      // Initialize metrics aggregators
      const sessions = new Map<
        string,
        { pages: Set<string>; firstTimestamp: number; hasDelayedInteraction: boolean }
      >();
      const pageViewCounts = new Map<string, number>();
      const interactionCounts = new Map<string, number>();
      const navigationPaths = new Map<string, number>();
      const scrollDepths = { '25': 0, '50': 0, '75': 0, '100': 0 };
      let totalTimeOnPage = 0;
      let timeOnPageCount = 0;
      let searchCount = 0;

      // Process each event
      for (const event of events) {
        // Track sessions
        if (!sessions.has(event.sessionId)) {
          sessions.set(event.sessionId, {
            pages: new Set(),
            firstTimestamp: event.timestamp,
            hasDelayedInteraction: false,
          });
        }
        const session = sessions.get(event.sessionId)!;

        // Track page views
        if (event.type === 'page_view') {
          session.pages.add(event.page);
          pageViewCounts.set(event.page, (pageViewCounts.get(event.page) || 0) + 1);
        }

        // Track scroll depth
        if (event.type === 'scroll' && event.data?.scrollDepth) {
          const depth = event.data.scrollDepth.toString() as keyof typeof scrollDepths;
          if (depth in scrollDepths) {
            scrollDepths[depth]++;
          }
        }

        // Track interactions
        if (
          (event.type === 'interaction' ||
            event.type === 'tab_switch' ||
            event.type === 'expand' ||
            event.type === 'share') &&
          event.data?.element
        ) {
          interactionCounts.set(
            event.data.element,
            (interactionCounts.get(event.data.element) || 0) + 1
          );

          // Check for delayed interaction (>10s after first page view)
          const timeSinceFirst = event.timestamp - session.firstTimestamp;
          if (timeSinceFirst > 10000) {
            session.hasDelayedInteraction = true;
          }
        }

        // Track time on page
        if (event.data?.timeOnPage) {
          totalTimeOnPage += event.data.timeOnPage;
          timeOnPageCount++;
        }

        // Track searches
        if (event.type === 'search') {
          searchCount++;
        }

        // Track navigation paths
        if (event.type === 'navigation' && event.data?.referrer && event.data?.targetPage) {
          const pathKey = `${event.data.referrer}|${event.data.targetPage}`;
          navigationPaths.set(pathKey, (navigationPaths.get(pathKey) || 0) + 1);
        }
      }

      // Calculate journey velocity (% of sessions with 2+ pages)
      const sessionsWithMultiplePages = Array.from(sessions.values()).filter(
        (s) => s.pages.size >= 2
      ).length;
      const journeyVelocity =
        sessions.size > 0 ? (sessionsWithMultiplePages / sessions.size) * 100 : 0;

      // Calculate delayed interaction rate
      const sessionsWithDelayedInteraction = Array.from(sessions.values()).filter(
        (s) => s.hasDelayedInteraction
      ).length;
      const delayedInteractionRate =
        sessions.size > 0 ? (sessionsWithDelayedInteraction / sessions.size) * 100 : 0;

      // Sort and limit top pages
      const topPages = Array.from(pageViewCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }));

      // Sort and limit top interactions
      const topInteractions = Array.from(interactionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([element, count]) => ({ element, count }));

      // Parse and sort navigation paths
      const sortedPaths = Array.from(navigationPaths.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pathKey, count]) => {
          const parts = pathKey.split('|');
          return { from: parts[0] ?? '', to: parts[1] ?? '', count };
        })
        .filter((p) => p.from && p.to);

      // Calculate total page views
      const pageViews = Array.from(pageViewCounts.values()).reduce((sum, count) => sum + count, 0);

      return {
        range,
        totalEvents: events.length,
        uniqueSessions: sessions.size,
        pageViews,
        averageTimeOnPage: timeOnPageCount > 0 ? Math.round(totalTimeOnPage / timeOnPageCount) : 0,
        journeyVelocity: Math.round(journeyVelocity * 10) / 10,
        scrollDepthDistribution: scrollDepths,
        delayedInteractionRate: Math.round(delayedInteractionRate * 10) / 10,
        topPages,
        topInteractions,
        searchCount,
        navigationPaths: sortedPaths,
      };
    } catch (error) {
      logger.error({ error, range }, 'Failed to calculate journey metrics');

      // Return empty metrics on error
      return {
        range,
        totalEvents: 0,
        uniqueSessions: 0,
        pageViews: 0,
        averageTimeOnPage: 0,
        journeyVelocity: 0,
        scrollDepthDistribution: { '25': 0, '50': 0, '75': 0, '100': 0 },
        delayedInteractionRate: 0,
        topPages: [],
        topInteractions: [],
        searchCount: 0,
        navigationPaths: [],
      };
    }
  }

  /**
   * Read events from Redis Stream within a time range
   */
  private async readEventsInRange(startTime: number, endTime: number): Promise<JourneyEvent[]> {
    const events: JourneyEvent[] = [];

    try {
      // XRANGE key start end [COUNT count]
      // Use '-' for start to get all, then filter by timestamp
      // For large datasets, consider using XREAD with blocking and batching
      const rawEvents = await redis.xrange(JOURNEY_STREAM_KEY, '-', '+', 'COUNT', 50000);

      for (const [, fields] of rawEvents) {
        // Parse fields from flat array
        const fieldMap: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          const key = fields[i];
          const value = fields[i + 1];
          if (key && value !== undefined) {
            fieldMap[key] = value;
          }
        }

        const timestampStr = fieldMap.timestamp;
        if (!timestampStr) continue;

        const timestamp = parseInt(timestampStr, 10);

        // Filter by time range
        if (timestamp < startTime || timestamp > endTime) {
          continue;
        }

        // Validate required fields
        const type = fieldMap.type as JourneyEventType | undefined;
        const page = fieldMap.page;
        const sessionId = fieldMap.sessionId;
        if (!type || !page || !sessionId) continue;

        // Reconstruct event object
        const event: JourneyEvent = {
          type,
          page,
          sessionId,
          timestamp,
          data: {},
        };

        // Add optional data fields
        if (fieldMap.scrollDepth) {
          event.data!.scrollDepth = parseInt(fieldMap.scrollDepth, 10);
        }
        if (fieldMap.targetPage) {
          event.data!.targetPage = fieldMap.targetPage;
        }
        if (fieldMap.timeOnPage) {
          event.data!.timeOnPage = parseInt(fieldMap.timeOnPage, 10);
        }
        if (fieldMap.element) {
          event.data!.element = fieldMap.element;
        }
        if (fieldMap.searchQuery) {
          event.data!.searchQuery = fieldMap.searchQuery;
        }
        if (fieldMap.referrer) {
          event.data!.referrer = fieldMap.referrer;
        }

        // Clean up empty data object
        if (Object.keys(event.data!).length === 0) {
          delete event.data;
        }

        events.push(event);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to read events from stream');
    }

    return events;
  }

  /**
   * Batch track multiple events (for sendBeacon payloads)
   */
  async trackEvents(events: JourneyEvent[]): Promise<void> {
    // Process events in parallel for efficiency
    await Promise.all(events.map((event) => this.trackEvent(event)));
  }

  /**
   * Get journey velocity for a specific session
   * Returns the number of unique pages visited
   */
  async getSessionJourney(sessionId: string): Promise<{ pagesVisited: number; pages: string[] }> {
    const sessionKey = `${JOURNEY_SESSION_PREFIX}:${sessionId}`;

    try {
      const pages = await redis.smembers(sessionKey);
      return {
        pagesVisited: pages.length,
        pages,
      };
    } catch (error) {
      logger.warn({ error, sessionId }, 'Failed to get session journey');
      return { pagesVisited: 0, pages: [] };
    }
  }

  /**
   * Health check for journey tracking system
   */
  async healthCheck(): Promise<{ healthy: boolean; streamLength?: number; error?: string }> {
    try {
      const length = await redis.xlen(JOURNEY_STREAM_KEY);
      return {
        healthy: true,
        streamLength: length,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const journeyTrackingService = new JourneyTrackingService();
