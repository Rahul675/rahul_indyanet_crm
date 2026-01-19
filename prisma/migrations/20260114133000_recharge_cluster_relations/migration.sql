-- Drop customer relation from recharges
ALTER TABLE "recharges" DROP CONSTRAINT IF EXISTS "recharges_customerId_fkey";
ALTER TABLE "recharges" DROP COLUMN IF EXISTS "customerId";

-- Add cluster/loadshare relations (nullable initially)
ALTER TABLE "recharges" ADD COLUMN "clusterId" TEXT;
ALTER TABLE "recharges" ADD COLUMN "loadshareId" TEXT;

-- Add FKs (can reference null values)
ALTER TABLE "recharges" ADD CONSTRAINT "recharges_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE CASCADE;
ALTER TABLE "recharges" ADD CONSTRAINT "recharges_loadshareId_fkey" FOREIGN KEY ("loadshareId") REFERENCES "loadshare"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "recharges_clusterId_idx" ON "recharges"("clusterId");
CREATE INDEX "recharges_loadshareId_idx" ON "recharges"("loadshareId");
