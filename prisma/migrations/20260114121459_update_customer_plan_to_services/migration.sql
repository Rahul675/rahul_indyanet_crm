-- Rename planType to servicesType and add paymentMode
ALTER TABLE "customers" RENAME COLUMN "planType" TO "servicesType";

-- Add paymentMode column (nullable)
ALTER TABLE "customers" ADD COLUMN "paymentMode" TEXT;

-- Remove obsolete recharge tracking fields from customers table
ALTER TABLE "customers" DROP COLUMN IF EXISTS "lastRechargeDate";
ALTER TABLE "customers" DROP COLUMN IF EXISTS "expiryDate";
ALTER TABLE "customers" DROP COLUMN IF EXISTS "totalRecharges";
