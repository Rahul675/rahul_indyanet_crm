-- CreateTable
CREATE TABLE "recharges" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "rechargeDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recharges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recharges_customerId_idx" ON "recharges"("customerId");

-- AddForeignKey
ALTER TABLE "recharges" ADD CONSTRAINT "recharges_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
