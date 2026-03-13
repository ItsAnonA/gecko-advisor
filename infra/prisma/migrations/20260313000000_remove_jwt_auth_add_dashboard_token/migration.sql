-- AlterTable: Add dashboardToken to ApiKey
ALTER TABLE "ApiKey" ADD COLUMN "dashboardToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_dashboardToken_key" ON "ApiKey"("dashboardToken");

-- CreateIndex
CREATE INDEX "ApiKey_dashboard_token_idx" ON "ApiKey"("dashboardToken");

-- DropForeignKey
ALTER TABLE "Scan" DROP CONSTRAINT "Scan_userId_fkey";

-- DropForeignKey
ALTER TABLE "WatchedUrl" DROP CONSTRAINT "WatchedUrl_userId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "WalletLink" DROP CONSTRAINT "WalletLink_userId_fkey";

-- DropIndex
DROP INDEX "Scan_user_history_idx";

-- DropIndex
DROP INDEX "Scan_public_reports_idx";

-- AlterTable: Remove auth columns from Scan
ALTER TABLE "Scan" DROP COLUMN "userId",
DROP COLUMN "isPublic",
DROP COLUMN "isProScan";

-- DropTable
DROP TABLE "WatchedUrl";

-- DropTable
DROP TABLE "PasswordResetToken";

-- DropTable
DROP TABLE "WalletLink";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "Subscription";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- DropEnum
DROP TYPE "AuthMethod";

-- DropEnum
DROP TYPE "CheckFrequency";
