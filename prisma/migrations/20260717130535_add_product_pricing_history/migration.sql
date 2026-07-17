-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "manualCost" DECIMAL(65,30),
ADD COLUMN     "minMarginPercent" DECIMAL(65,30),
ADD COLUMN     "minSalePrice" DECIMAL(65,30),
ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "salePrice" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldSalePrice" DECIMAL(65,30),
    "newSalePrice" DECIMAL(65,30),
    "oldMinSalePrice" DECIMAL(65,30),
    "newMinSalePrice" DECIMAL(65,30),
    "productionCostAtChange" DECIMAL(65,30) NOT NULL,
    "marginBefore" DECIMAL(65,30),
    "marginAfter" DECIMAL(65,30),
    "reason" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCostHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldCost" DECIMAL(65,30) NOT NULL,
    "newCost" DECIMAL(65,30) NOT NULL,
    "source" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_idx" ON "ProductPriceHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_createdAt_idx" ON "ProductPriceHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ProductCostHistory_productId_idx" ON "ProductCostHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductCostHistory_createdAt_idx" ON "ProductCostHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
