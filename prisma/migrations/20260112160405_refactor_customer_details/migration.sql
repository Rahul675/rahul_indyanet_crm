-- Drop the old details column and create new additionalInfo column
ALTER TABLE "customers" DROP COLUMN IF EXISTS "details";
ALTER TABLE "customers" ADD COLUMN "additionalInfo" jsonb NOT NULL DEFAULT '{}'::jsonb;
