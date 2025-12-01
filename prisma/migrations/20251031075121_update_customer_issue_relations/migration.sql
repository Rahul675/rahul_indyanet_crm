/*
  Warnings:

  - You are about to drop the column `issueCode` on the `issues` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."issues" DROP CONSTRAINT "issues_customerId_fkey";

-- DropIndex
DROP INDEX "public"."issues_issueCode_key";

-- AlterTable
ALTER TABLE "issues" DROP COLUMN "issueCode";

-- CreateIndex
CREATE INDEX "issues_customerId_idx" ON "issues"("customerId");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
