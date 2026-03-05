-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "lemonSqueezyCustomerId" TEXT,
ADD COLUMN     "lemonSqueezySubscriptionId" TEXT,
ADD COLUMN     "lemonSqueezyOrderId" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "lastResetAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ApiKey_ls_subscription_idx" ON "ApiKey"("lemonSqueezySubscriptionId");

-- CreateIndex
CREATE INDEX "ApiKey_ls_order_idx" ON "ApiKey"("lemonSqueezyOrderId");

-- CreateIndex
CREATE INDEX "ApiKey_ls_customer_idx" ON "ApiKey"("lemonSqueezyCustomerId");
