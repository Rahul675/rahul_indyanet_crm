-- Remove code (unique constraint) and state columns from clusters table
ALTER TABLE "clusters" DROP COLUMN IF EXISTS "code";
ALTER TABLE "clusters" DROP COLUMN IF EXISTS "state";
