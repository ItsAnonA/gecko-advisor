/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import type { HttpLogger, Options as PinoHttpOptions } from "pino-http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { requestId } from "./middleware/request-id.js";
import { performanceMonitor, addPerformanceHeaders } from "./middleware/performance-monitor.js";
import { apiV1Router, apiV2Router } from "./routes/index.js";
import { adminRouter } from "./routes/admin.js";
import { docsRouter } from "./routes/docs.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./health.js";
import { sitemapRouter } from "./routes/sitemap.js";
import { ssrBlogRouter } from "./routes/ssr.blog.js";
import { ssrDomainRouter } from "./routes/ssr.domain.js";
import { initSentry, Sentry } from "./sentry.js";
import { problem } from "./problem.js";

const allowedOrigins = config.allowedOrigins;
const createHttpLogger = pinoHttp as unknown as (options?: PinoHttpOptions) => HttpLogger;


export function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const sentryEnabled = initSentry();

  app.use(requestId);

  // Enable gzip/deflate compression for all responses
  // IMPORTANT: Must come BEFORE performance monitor to avoid res.end() conflicts
  // This significantly reduces payload size for large JSON responses (e.g., reports with 400+ evidence items)
  // Compression is applied to responses >= 1KB by default
  app.use(compression({
    level: 6, // Balanced compression (0-9, where 6 is default and recommended)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses with 'Cache-Control: no-transform' directive
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression's default filter (text/html, application/json, etc.)
      return compression.filter(req, res);
    }
  }));

  // Add performance monitoring and headers (must come AFTER compression)
  app.use(addPerformanceHeaders);
  app.use(performanceMonitor);

  app.use(
    createHttpLogger({
      logger,
      autoLogging: {
        ignore: (req) => req.url?.startsWith('/healthz') ?? false,
      },
      genReqId: (_req, res) => (res as Response).locals.requestId ?? undefined,
      customProps: (_req, res) => ({
        requestId: (res as Response).locals.requestId,
      }),
    }) as unknown as express.RequestHandler
  );

  app.use(express.json({ limit: '200kb' }));

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': config.csp.imageSources,
          'font-src': ["'self'", 'data:'],
          'media-src': ["'none'"],
          'connect-src': config.csp.connectSources,
          'frame-ancestors': ["'none'"],
          'object-src': ["'none'"],
          'form-action': ["'self'"],
          'base-uri': ["'self'"],
          'upgrade-insecure-requests': [],
          ...(config.cspReportUri
            ? { 'report-uri': [config.cspReportUri] }
            : {}),
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'X-Admin-Key',
        'X-Request-ID',
        'Authorization',
        'X-API-Key',
      ],
      maxAge: 600,
      credentials: false,
      preflightContinue: false,
    })
  );

  app.use('/api', healthRouter);

  // 100% Free Launch: NO rate limiting middleware
  // Security is handled by:
  // - Cloudflare Turnstile (bot protection)
  // - Infrastructure monitoring
  // - DDoS protection at CDN level
  // All users get unlimited scans - trust-based approach

  app.use('/api/v1', apiV1Router);
  app.use('/api/v2', apiV2Router);
  app.use('/api', apiV2Router);

  app.use('/api', adminRouter);

  // Auth routes are feature-flagged (ENABLE_AUTH=false by default)
  // Gecko Advisor's mission is "no auth required" - auth is opt-in for future Pro features
  if (config.enableAuth) {
    app.use('/api/auth', authRouter);
    logger.info('Auth routes enabled (ENABLE_AUTH=true)');
  }
  app.use('/docs', docsRouter);

  // SEO: Dynamic sitemap routes
  // Mount at both root (for direct access) and /api (for Coolify proxy routing)
  app.use('/', sitemapRouter);
  app.use('/api', sitemapRouter);

  // SEO: SSR blog pages for search engine indexing
  // Serves pre-rendered HTML with full content, meta tags, and structured data
  // This ensures Googlebot can index blog content without JavaScript rendering
  app.use('/', ssrBlogRouter);

  // SEO: SSR privacy-policy domain pages for search engine indexing
  // Serves pre-rendered HTML for /privacy-policy/:domain canonical URLs
  // Includes full meta tags, JSON-LD structured data, and crawlable summary text
  app.use('/', ssrDomainRouter);

  if (sentryEnabled) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    // Log the full error details securely (only in logs, not in response)
    logger.error({
      err,
      requestId: res.locals.requestId,
      method: req.method,
      url: req.url,
      ip: req.ip
    }, 'Unhandled error');

    // Never expose internal error details in response
    // The problem() function will handle sanitization based on environment
    if (err instanceof Error) {
      // Handle specific error types with appropriate status codes
      if (err.name === 'ValidationError') {
        return problem(res, 400, 'Bad Request', 'Invalid input data');
      }
      if (err.name === 'UnauthorizedError') {
        return problem(res, 401, 'Unauthorized');
      }
      if (err.name === 'ForbiddenError') {
        return problem(res, 403, 'Forbidden');
      }
      if (err.name === 'NotFoundError') {
        return problem(res, 404, 'Not Found');
      }
    }

    // Default to 500 for all other errors
    return problem(res, 500, 'Internal Server Error');
  });

  return app;
}





