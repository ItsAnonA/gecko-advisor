-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "displayName" TEXT,
    "latestScanId" TEXT,
    "firstScanned" TIMESTAMP(3),
    "lastScanned" TIMESTAMP(3),
    "isIndexed" BOOLEAN NOT NULL DEFAULT true,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "Domain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_latestScanId_key" ON "Domain"("latestScanId");

-- CreateIndex
CREATE INDEX "Domain_lookup_idx" ON "Domain"("domain");

-- CreateIndex
CREATE INDEX "Domain_sitemap_idx" ON "Domain"("isIndexed", "lastScanned" DESC);

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_latestScanId_fkey" FOREIGN KEY ("latestScanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
