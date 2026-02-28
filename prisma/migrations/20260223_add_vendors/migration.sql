-- Create vendors table
CREATE TABLE "vendors" (
  "id" TEXT NOT NULL,
  "vendorName" TEXT NOT NULL,
  "contactNumber" TEXT NOT NULL,
  "servicesType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "onboardDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "vendorCode" TEXT NOT NULL,
  "additionalInfo" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "paymentMode" TEXT,
  CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- Unique index for vendor code
CREATE UNIQUE INDEX "vendors_vendorCode_key" ON "vendors"("vendorCode");

-- Supporting indexes
CREATE INDEX "vendors_status_idx" ON "vendors"("status");
CREATE INDEX "vendors_onboardDate_idx" ON "vendors"("onboardDate");
