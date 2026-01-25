-- Sample Comparisons (UX only, NOT for SEO)
-- Curated comparison pairs to help users understand the compare feature
-- IMPORTANT: Never index, never add to sitemap, max 3 per category

-- CreateTable
CREATE TABLE "SampleComparison" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "domainA" TEXT NOT NULL,
    "domainB" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SampleComparison_categoryId_idx" ON "SampleComparison"("categoryId");

-- CreateIndex
CREATE INDEX "SampleComparison_active_idx" ON "SampleComparison"("active");

-- AddForeignKey
ALTER TABLE "SampleComparison" ADD CONSTRAINT "SampleComparison_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
