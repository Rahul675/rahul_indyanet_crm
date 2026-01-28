-- CreateTable: other_client_groups
CREATE TABLE IF NOT EXISTS "other_client_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "assignedOperators" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "other_client_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: other_client_sites
CREATE TABLE IF NOT EXISTS "other_client_sites" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "lanIp" TEXT,
    "remarks" TEXT,
    "macId" TEXT,
    "landlineWifiId" TEXT,
    "speedMbps" TEXT,
    "internet" TEXT,
    "installation" TEXT,
    "installationDate" TIMESTAMP(3),
    "received" TEXT,
    "dispatch" TEXT,
    "contactNo" TEXT,
    "dvrConnected" TEXT,
    "simNo" TEXT,
    "deviceName" TEXT,
    "deviceLicense" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aValue" TEXT,
    "dispatchDate" TIMESTAMP(3),
    "internetInstallation" TEXT,
    "reachedDay" TEXT,
    "prevBillReceived" TEXT,
    "aSpoke" TEXT,
    "groupId" TEXT NOT NULL,
    CONSTRAINT "other_client_sites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "other_client_sites_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "other_client_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "other_client_sites_site_idx" ON "other_client_sites"("site");
CREATE INDEX IF NOT EXISTS "other_client_sites_groupId_idx" ON "other_client_sites"("groupId");
