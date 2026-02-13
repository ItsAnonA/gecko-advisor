-- CreateEnum
CREATE TYPE "TransparencyReportStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UPDATED');

-- CreateTable
CREATE TABLE "TransparencyReport" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TransparencyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "autoPublished" BOOLEAN NOT NULL DEFAULT false,
    "metricsSnapshot" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "quotables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyFinding" TEXT,
    "revisionNote" TEXT,
    "methodologySnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransparencyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransparencyReport_slug_key" ON "TransparencyReport"("slug");

-- CreateIndex
CREATE INDEX "TransparencyReport_status_published_idx" ON "TransparencyReport"("status", "publishedAt" DESC);
