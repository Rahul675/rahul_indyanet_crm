-- Regenerate customer codes with simple incrementing format
-- This migration updates all existing customer codes to CUST-0001, CUST-0002, etc.

WITH numbered_customers AS (
  SELECT 
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as row_num
  FROM "customers"
)
UPDATE "customers"
SET "customerCode" = 'CUST-' || LPAD(numbered_customers.row_num::text, 4, '0')
FROM numbered_customers
WHERE "customers"."id" = numbered_customers."id";
