-- CreateTable
CREATE TABLE "other_clients" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "lanIp" TEXT,
    "remarks" TEXT,
    "macId" TEXT,
    "landlineWifiId" TEXT,
    "speedMbps" INTEGER,
    "internet" TEXT,
    "installation" TEXT,
    "previousInternetBill" DOUBLE PRECISION,
    "received" TEXT,
    "dispatch" TEXT,
    "date" TIMESTAMP(3),
    "reachedDay" TEXT,
    "installationDate" TIMESTAMP(3),
    "aSpoke" TEXT,
    "contactNo" TEXT,
    "dvrConnected" TEXT,
    "simNo" TEXT,
    "deviceName" TEXT,
    "deviceLicense" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "other_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "other_clients_site_idx" ON "other_clients"("site");

-- CreateIndex
CREATE INDEX "other_clients_lanIp_idx" ON "other_clients"("lanIp");
