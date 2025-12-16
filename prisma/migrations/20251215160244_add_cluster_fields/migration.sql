/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `clusters` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rtNumber,clusterId]` on the table `loadshare` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `clusters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `clusters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `clusters` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clusters" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clusters_code_key" ON "clusters"("code");

-- CreateIndex
CREATE UNIQUE INDEX "loadshare_rtNumber_clusterId_key" ON "loadshare"("rtNumber", "clusterId");
