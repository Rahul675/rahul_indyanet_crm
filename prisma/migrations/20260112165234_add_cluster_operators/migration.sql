-- Add assignedOperators array field to clusters table
ALTER TABLE "clusters" ADD COLUMN "assignedOperators" TEXT[] NOT NULL DEFAULT '{}';
