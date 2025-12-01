/*
  Warnings:

  - Added the required column `updatedAt` to the `issues` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
