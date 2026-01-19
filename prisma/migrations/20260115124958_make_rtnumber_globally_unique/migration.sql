-- DropIndex
DROP INDEX IF EXISTS "LoadShare_rtNumber_clusterId_key";

-- DropIndex
DROP INDEX IF EXISTS "LoadShare_rtNumber_idx";

-- CreateIndex
CREATE UNIQUE INDEX "LoadShare_rtNumber_key" ON "LoadShare"("rtNumber");
