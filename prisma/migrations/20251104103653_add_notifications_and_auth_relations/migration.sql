/*
  Warnings:

  - You are about to drop the column `who` on the `audit_logs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."audit_logs_entity_idx";

-- DropIndex
DROP INDEX "public"."audit_logs_who_idx";

-- DropIndex
DROP INDEX "public"."issues_createdDate_idx";

-- DropIndex
DROP INDEX "public"."loadshare_address_idx";

-- DropIndex
DROP INDEX "public"."loadshare_state_idx";

-- DropIndex
DROP INDEX "public"."other_clients_lanIp_idx";

-- DropIndex
DROP INDEX "public"."users_isOnline_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "who",
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLogoutAt" TIMESTAMP(3),
ADD COLUMN     "logoutReason" TEXT,
ALTER COLUMN "role" SET DEFAULT 'operator';

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "rechargeId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_rechargeId_idx" ON "notifications"("rechargeId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_rechargeId_fkey" FOREIGN KEY ("rechargeId") REFERENCES "recharges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
