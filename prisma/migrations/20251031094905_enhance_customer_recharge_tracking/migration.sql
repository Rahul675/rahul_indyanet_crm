-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "lastRechargeDate" TIMESTAMP(3),
ADD COLUMN     "totalRecharges" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "recharges" ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "transactionId" TEXT;
