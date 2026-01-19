-- Add details JSON field to customers table with default value
ALTER TABLE "customers" ADD COLUMN "details" jsonb NOT NULL DEFAULT '{"phoneNumbers": [], "emails": [], "addresses": []}'::jsonb;
