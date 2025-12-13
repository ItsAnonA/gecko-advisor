-- CreateEnum
CREATE TYPE "ScanQueueStatus" AS ENUM ('PENDING', 'QUEUED', 'SUCCESS', 'FAILED', 'BLOCKED', 'TIMEOUT', 'INVALID');

-- CreateTable
CREATE TABLE "ScanQueue" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "ScanQueueStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "sourceRank" INTEGER,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "lastError" TEXT,
    "scanId" TEXT,
    "score" INTEGER,
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScanQueue_domain_key" ON "ScanQueue"("domain");

-- CreateIndex
CREATE INDEX "ScanQueue_process_idx" ON "ScanQueue"("status", "priority" DESC);

-- CreateIndex
CREATE INDEX "ScanQueue_retry_idx" ON "ScanQueue"("status", "lastAttempt");

-- CreateIndex
CREATE INDEX "ScanQueue_batch_idx" ON "ScanQueue"("batchId", "status");

-- CreateIndex
CREATE INDEX "ScanQueue_source_idx" ON "ScanQueue"("source", "sourceRank");
