/*
  Warnings:

  - Added the required column `clusterId` to the `loadshare` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "loadshare" ADD COLUMN     "clusterId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "clusters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loadshare_clusterId_idx" ON "loadshare"("clusterId");

-- AddForeignKey
ALTER TABLE "loadshare" ADD CONSTRAINT "loadshare_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
