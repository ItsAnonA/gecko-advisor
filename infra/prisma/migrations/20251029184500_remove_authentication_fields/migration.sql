-- SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
-- SPDX-License-Identifier: MIT

/*
  Warnings:

  - You are about to drop the column `userId` on the `Scan` table. All the data in the column will be lost.
  - You are about to drop the column `isProScan` on the `Scan` table. All the data in the column will be lost.
  - You are about to drop the column `apiKey` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `apiCallsMonth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `apiResetAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `authMethod` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscription` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionEndsAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WalletLink` table. If the table is not empty, all the data it contains will be lost.

*/

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Scan" DROP CONSTRAINT IF EXISTS "Scan_userId_fkey";

-- DropForeignKey
ALTER TABLE "WalletLink" DROP CONSTRAINT IF EXISTS "WalletLink_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Scan_userId_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "User_apiKey_key";

-- DropIndex
DROP INDEX IF EXISTS "User_apiKey_idx";

-- AlterTable
ALTER TABLE "Scan" DROP COLUMN IF EXISTS "userId",
DROP COLUMN IF EXISTS "isProScan";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "apiKey",
DROP COLUMN IF EXISTS "apiCallsMonth",
DROP COLUMN IF EXISTS "apiResetAt",
DROP COLUMN IF EXISTS "authMethod",
DROP COLUMN IF EXISTS "emailVerified",
DROP COLUMN IF EXISTS "passwordHash",
DROP COLUMN IF EXISTS "subscription",
DROP COLUMN IF EXISTS "subscriptionStatus",
DROP COLUMN IF EXISTS "subscriptionEndsAt";

-- DropTable
DROP TABLE IF EXISTS "PasswordResetToken";

-- DropTable
DROP TABLE IF EXISTS "WalletLink";

-- DropEnum
DROP TYPE IF EXISTS "AuthMethod";

-- DropEnum
DROP TYPE IF EXISTS "Subscription";

-- DropEnum
DROP TYPE IF EXISTS "SubscriptionStatus";
