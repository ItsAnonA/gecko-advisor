-- CreateEnum
CREATE TYPE "ApiKeyTier" AS ENUM ('EVALUATION', 'OPERATIONAL', 'BULK_INTELLIGENCE', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "tier" "ApiKeyTier" NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "requestLimit" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_email_idx" ON "ApiKey"("customerEmail");
