-- CreateEnum
CREATE TYPE "OperationCostModel" AS ENUM ('fixed', 'perTime', 'perQuantity', 'percentage');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeasurementUnit" ADD VALUE 'squareMeter';
ALTER TYPE "MeasurementUnit" ADD VALUE 'squareCm';
ALTER TYPE "MeasurementUnit" ADD VALUE 'cubicMeter';
ALTER TYPE "MeasurementUnit" ADD VALUE 'cubicCm';

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "costModel" "OperationCostModel" NOT NULL,
    "standardCost" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operation_name_key" ON "Operation"("name");

-- CreateIndex
CREATE INDEX "Operation_archivedAt_idx" ON "Operation"("archivedAt");

-- CreateIndex
CREATE INDEX "Operation_category_idx" ON "Operation"("category");
