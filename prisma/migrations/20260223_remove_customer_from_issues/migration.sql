-- Remove customerId column from issues table
-- This migration removes the customer relationship from issues

ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "issues_customerId_fkey";
ALTER TABLE "issues" DROP COLUMN IF EXISTS "customerId";
