-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('ton', 'kg', 'gram', 'meter', 'cm', 'mm', 'liter', 'ml', 'roll', 'box', 'piece');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('text', 'number', 'list', 'boolean', 'unit', 'color', 'file', 'image');

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "purchaseUnit" "MeasurementUnit" NOT NULL,
    "baseUnit" "MeasurementUnit" NOT NULL,
    "conversionFactor" DECIMAL(65,30) NOT NULL,
    "purchaseUnitPrice" DECIMAL(65,30) NOT NULL,
    "baseUnitPrice" DECIMAL(65,30) NOT NULL,
    "lastPurchasePrice" DECIMAL(65,30),
    "avgPurchasePrice" DECIMAL(65,30),
    "status" "MaterialStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceHistory" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "oldPurchaseUnitPrice" DECIMAL(65,30),
    "newPurchaseUnitPrice" DECIMAL(65,30) NOT NULL,
    "oldBaseUnitPrice" DECIMAL(65,30),
    "newBaseUnitPrice" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AttributeType" NOT NULL,
    "unit" "MeasurementUnit",
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "showInQuotes" BOOLEAN NOT NULL DEFAULT false,
    "showOnWebsite" BOOLEAN NOT NULL DEFAULT false,
    "usedInFilter" BOOLEAN NOT NULL DEFAULT false,
    "internalOnly" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeValue" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_status_idx" ON "Material"("status");

-- CreateIndex
CREATE INDEX "Material_category_idx" ON "Material"("category");

-- CreateIndex
CREATE INDEX "MaterialPriceHistory_materialId_idx" ON "MaterialPriceHistory"("materialId");

-- CreateIndex
CREATE INDEX "MaterialPriceHistory_createdAt_idx" ON "MaterialPriceHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_name_key" ON "Attribute"("name");

-- CreateIndex
CREATE INDEX "Attribute_archivedAt_idx" ON "Attribute"("archivedAt");

-- CreateIndex
CREATE INDEX "AttributeValue_attributeId_idx" ON "AttributeValue"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeValue_attributeId_value_key" ON "AttributeValue"("attributeId", "value");

-- AddForeignKey
ALTER TABLE "MaterialPriceHistory" ADD CONSTRAINT "MaterialPriceHistory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
