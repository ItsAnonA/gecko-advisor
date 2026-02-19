-- Error-Weighted Confidence + Latency Percentile Tracking
-- Stabilization Sprint: Feb 19, 2026

-- Scan: wall-clock duration for latency percentile tracking
ALTER TABLE "Scan" ADD COLUMN "durationMs" INTEGER;

-- Domain: error-weighted scan confidence (Laplace-smoothed beta mean)
ALTER TABLE "Domain" ADD COLUMN "scanConfidence" DOUBLE PRECISION;
ALTER TABLE "Domain" ADD COLUMN "scanSuccessCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN "scanFailureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Domain" ADD COLUMN "confidenceUpdatedAt" TIMESTAMP(3);
