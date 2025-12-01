-- CreateTable
CREATE TABLE "loadshare" (
    "id" TEXT NOT NULL,
    "nameOfLocation" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "circuitId" TEXT NOT NULL,
    "isp" TEXT NOT NULL,
    "rtNumber" TEXT NOT NULL,
    "invoice" TEXT,
    "speed" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "validity" INTEGER NOT NULL,
    "paidBy" TEXT NOT NULL,
    "activationDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "installationCharges" DOUBLE PRECISION NOT NULL,
    "internetCharges" DOUBLE PRECISION NOT NULL,
    "gstPercent" DOUBLE PRECISION NOT NULL,
    "gstAmount" DOUBLE PRECISION NOT NULL,
    "totalPayable" DOUBLE PRECISION NOT NULL,
    "month" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedFrom" TEXT NOT NULL,
    "wifiOrNumber" TEXT,
    "hubSpocName" TEXT,
    "hubSpocNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loadshare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loadshare_rtNumber_key" ON "loadshare"("rtNumber");

-- CreateIndex
CREATE INDEX "loadshare_rtNumber_idx" ON "loadshare"("rtNumber");

-- CreateIndex
CREATE INDEX "loadshare_nameOfLocation_idx" ON "loadshare"("nameOfLocation");

-- CreateIndex
CREATE INDEX "loadshare_address_idx" ON "loadshare"("address");
