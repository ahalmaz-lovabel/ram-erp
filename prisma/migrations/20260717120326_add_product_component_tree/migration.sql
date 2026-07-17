-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'inactive', 'suspended', 'archived');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "productionCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "lengthCm" DECIMAL(65,30),
    "widthCm" DECIMAL(65,30),
    "thicknessMm" DECIMAL(65,30),
    "weightKg" DECIMAL(65,30),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentMaterial" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "wastePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentOperation" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "operationId" TEXT,
    "name" TEXT NOT NULL,
    "costModel" "OperationCostModel" NOT NULL,
    "standardCost" DECIMAL(65,30) NOT NULL,
    "param" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Component_productId_idx" ON "Component"("productId");

-- CreateIndex
CREATE INDEX "Component_parentId_idx" ON "Component"("parentId");

-- CreateIndex
CREATE INDEX "ComponentMaterial_componentId_idx" ON "ComponentMaterial"("componentId");

-- CreateIndex
CREATE INDEX "ComponentMaterial_materialId_idx" ON "ComponentMaterial"("materialId");

-- CreateIndex
CREATE INDEX "ComponentOperation_componentId_idx" ON "ComponentOperation"("componentId");

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMaterial" ADD CONSTRAINT "ComponentMaterial_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMaterial" ADD CONSTRAINT "ComponentMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentOperation" ADD CONSTRAINT "ComponentOperation_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentOperation" ADD CONSTRAINT "ComponentOperation_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
