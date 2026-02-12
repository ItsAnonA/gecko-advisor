/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { z } from "zod";

export const EvidenceKind = z.enum([
  'tracker',
  'cookie',
  'header',
  'insecure',
  'thirdparty',
  'policy',
  'tls',
  'fingerprint',
  'mixed-content',
]);

// ============================================================================
// Evidence Details Schemas (per-kind)
//
// Each schema describes the `details` JSON field for a given evidence kind.
// All schemas use .passthrough() to tolerate unexpected fields in existing
// data while still enforcing known fields.
// ============================================================================

/** details for kind: 'tracker' */
export const TrackerDetailsSchema = z.object({
  domain: z.string(),
  fingerprinting: z.boolean().optional(),
}).passthrough();

/** details for kind: 'thirdparty' */
export const ThirdPartyDetailsSchema = z.object({
  domain: z.string(),
  root: z.string().optional(),
  fingerprinting: z.boolean().optional(),
}).passthrough();

/** details for kind: 'header' */
export const HeaderDetailsSchema = z.object({
  name: z.string(),
}).passthrough();

/** details for kind: 'cookie' */
export const CookieDetailsSchema = z.object({
  cookie: z.string(),
}).passthrough();

/** details for kind: 'tls' */
export const TlsDetailsSchema = z.object({
  grade: z.string(),
}).passthrough();

/** details for kind: 'policy' */
export const PolicyDetailsSchema = z.object({
  href: z.string(),
}).passthrough();

/** details for kind: 'fingerprint' (may be empty or contain a signal name) */
export const FingerprintDetailsSchema = z.object({
  signal: z.string().optional(),
}).passthrough();

/** details for kind: 'insecure' and 'mixed-content' */
export const InsecureDetailsSchema = z.object({
  url: z.string(),
  host: z.string().optional(),
  path: z.string().optional(),
  resourceType: z.enum(['resource', 'link']).optional(),
}).passthrough();

/**
 * Union of all known evidence detail shapes.
 * Used as a fallback when the evidence kind is not known at schema-parse time.
 * Falls back to z.record(z.string(), z.unknown()) for completely unknown shapes.
 */
export const EvidenceDetailsSchema = z.union([
  TrackerDetailsSchema,
  ThirdPartyDetailsSchema,
  HeaderDetailsSchema,
  CookieDetailsSchema,
  TlsDetailsSchema,
  PolicyDetailsSchema,
  FingerprintDetailsSchema,
  InsecureDetailsSchema,
  z.record(z.string(), z.unknown()),
]);

/**
 * Maps each evidence kind to its typed details schema.
 * Useful for runtime validation when the kind is known.
 */
export const EvidenceDetailsSchemaByKind = {
  tracker: TrackerDetailsSchema,
  thirdparty: ThirdPartyDetailsSchema,
  header: HeaderDetailsSchema,
  cookie: CookieDetailsSchema,
  tls: TlsDetailsSchema,
  policy: PolicyDetailsSchema,
  fingerprint: FingerprintDetailsSchema,
  insecure: InsecureDetailsSchema,
  'mixed-content': InsecureDetailsSchema,
} as const satisfies Record<z.infer<typeof EvidenceKind>, z.ZodType>;

// Inferred TypeScript types for each evidence details shape
export type TrackerDetails = z.infer<typeof TrackerDetailsSchema>;
export type ThirdPartyDetails = z.infer<typeof ThirdPartyDetailsSchema>;
export type HeaderDetails = z.infer<typeof HeaderDetailsSchema>;
export type CookieDetails = z.infer<typeof CookieDetailsSchema>;
export type TlsDetails = z.infer<typeof TlsDetailsSchema>;
export type PolicyDetails = z.infer<typeof PolicyDetailsSchema>;
export type FingerprintDetails = z.infer<typeof FingerprintDetailsSchema>;
export type InsecureDetails = z.infer<typeof InsecureDetailsSchema>;

/** Union of all known evidence detail types */
export type EvidenceDetails = z.infer<typeof EvidenceDetailsSchema>;

export const IssueSeverity = z.enum(['info', 'low', 'medium', 'high', 'critical']);

export const UrlScanRequestSchema = z.object({
  url: z.string().url().max(2048),
  force: z.boolean().optional(),
});

export const AppScanRequestSchema = z.object({
  appId: z.string().min(2).max(200),
});

export const AddressScanRequestSchema = z.object({
  address: z.string().min(4).max(200),
  chain: z.enum(['evm', 'solana']).default('evm'),
});

export const ScanQueuedResponseSchema = z.object({
  scanId: z.string(),
  slug: z.string(),
  deduped: z.boolean().optional(),
});

export const ScanStatusSchema = z.object({
  status: z.enum(['queued', 'running', 'done', 'error']),
  progress: z.number().min(0).max(100).optional(),
  score: z.number().min(0).max(100).optional(),
  label: z.enum(['Low Privacy Risk', 'Moderate Privacy Risk', 'High Privacy Risk']).optional(),
  slug: z.string().optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const EvidenceSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  kind: EvidenceKind,
  severity: z.number().int().min(1).max(5),
  title: z.string(),
  details: EvidenceDetailsSchema,
  createdAt: z.string().or(z.date()),
});

// Legacy schema for v1 API that uses 'type' instead of 'kind'
export const LegacyEvidenceSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  type: EvidenceKind,
  severity: z.number().int().min(1).max(5),
  title: z.string(),
  details: EvidenceDetailsSchema,
  createdAt: z.string().or(z.date()),
});

export const IssueReferenceSchema = z.object({
  label: z.string().max(120).optional(),
  url: z.string().url(),
});

export const IssueSchema = z.object({
  id: z.string(),
  key: z.string().optional(),
  category: z.string(),
  severity: IssueSeverity,
  title: z.string(),
  summary: z.string().nullable().optional(),
  howToFix: z.string().nullable().optional(),
  whyItMatters: z.string().nullable().optional(),
  references: z.array(IssueReferenceSchema),
  sortWeight: z.number().optional(),
});

export const TopFixSchema = IssueSchema.pick({
  id: true,
  key: true,
  category: true,
  severity: true,
  title: true,
  howToFix: true,
  whyItMatters: true,
  references: true,
});

export const ScanSchema = z.object({
  id: z.string(),
  targetType: z.string(),
  input: z.string(),
  normalizedInput: z.string().nullable().optional(),
  status: z.string(),
  score: z.number().nullable().optional(),
  label: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  summary: z.string().nullable().optional(),
  slug: z.string(),
  source: z.string().optional(),
  startedAt: z.string().or(z.date()).nullable().optional(),
  finishedAt: z.string().or(z.date()).nullable().optional(),
  shareMessage: z.string().nullable().optional(),
  meta: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const ReportResponseSchema = z.object({
  scan: ScanSchema,
  evidence: z.array(EvidenceSchema),
  issues: z.array(IssueSchema),
  topFixes: z.array(TopFixSchema),
  meta: z
    .object({
      dataSharing: z.enum(['None', 'Low', 'Medium', 'High']).optional(),
      domain: z.string().optional(),
    })
    .optional(),
});

// Legacy report response schema for v1 API (uses 'type' instead of 'kind')
export const LegacyReportResponseSchema = z.object({
  scan: ScanSchema,
  evidence: z.array(LegacyEvidenceSchema),
  meta: z
    .object({
      dataSharing: z.enum(['None', 'Low', 'Medium', 'High']).optional(),
      domain: z.string().optional(),
    })
    .optional(),
});

export const RecentReportItemSchema = z.object({
  slug: z.string(),
  score: z.number(),
  label: z.enum(['Low Privacy Risk', 'Moderate Privacy Risk', 'High Privacy Risk']).or(z.string()),
  domain: z.string(),
  createdAt: z.string().or(z.date()),
  evidenceCount: z.number().default(0),
});

export const RecentReportsResponseSchema = z.object({
  items: z.array(RecentReportItemSchema),
});

export type UrlScanRequest = z.infer<typeof UrlScanRequestSchema>;
export type ScanQueuedResponse = z.infer<typeof ScanQueuedResponseSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type LegacyEvidence = z.infer<typeof LegacyEvidenceSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type TopFix = z.infer<typeof TopFixSchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
export type LegacyReportResponse = z.infer<typeof LegacyReportResponseSchema>;
export type RecentReportsResponse = z.infer<typeof RecentReportsResponseSchema>;

// ============================================================================
// Blog Schemas
// ============================================================================

export const BlogPostStatus = z.enum(['DRAFT', 'PUBLISHED']);

export const BlogPostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  content: z.string(),
  coverImage: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  status: BlogPostStatus,
  publishedAt: z.string().or(z.date()).nullable().optional(),
  readTimeMinutes: z.number().int().min(1).default(5),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const BlogPostListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  coverImage: z.string().nullable().optional(),
  publishedAt: z.string().or(z.date()).nullable().optional(),
  readTimeMinutes: z.number().int().min(1).default(5),
});

export const BlogPostsListResponseSchema = z.object({
  items: z.array(BlogPostListItemSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(50),
    totalCount: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export const CreateBlogPostSchema = z.object({
  slug: z.string().min(3).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  }),
  title: z.string().min(3).max(200),
  excerpt: z.string().min(10).max(500),
  content: z.string().min(50),
  coverImage: z.string().url().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  status: BlogPostStatus.default('DRAFT'),
  publishedAt: z.string().datetime().optional(),
  readTimeMinutes: z.number().int().min(1).max(60).default(5),
});

export const UpdateBlogPostSchema = CreateBlogPostSchema.partial();

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type BlogPostListItem = z.infer<typeof BlogPostListItemSchema>;
export type BlogPostsListResponse = z.infer<typeof BlogPostsListResponseSchema>;
export type CreateBlogPost = z.infer<typeof CreateBlogPostSchema>;
export type UpdateBlogPost = z.infer<typeof UpdateBlogPostSchema>;
