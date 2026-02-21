-- Add cluster and loadshare references to Issue
ALTER TABLE "issues" ADD COLUMN "clusterId" TEXT,
ADD COLUMN "loadshareId" TEXT;

-- Add indexes for the new columns
CREATE INDEX "issues_clusterId_idx" ON "issues"("clusterId");
CREATE INDEX "issues_loadshareId_idx" ON "issues"("loadshareId");

-- Add foreign key constraints
ALTER TABLE "issues" ADD CONSTRAINT "issues_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "issues" ADD CONSTRAINT "issues_loadshareId_fkey" FOREIGN KEY ("loadshareId") REFERENCES "loadshare"("id") ON DELETE SET NULL ON UPDATE CASCADE;
