-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('person', 'organization', 'company', 'club', 'gym', 'distributor');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('prospect', 'active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('ad', 'referral', 'visit', 'call', 'exhibition', 'existing');

-- CreateEnum
CREATE TYPE "ContactDepartment" AS ENUM ('management', 'purchasing', 'accounts', 'website', 'receiving');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('interested', 'contacting', 'quote_sent', 'negotiation', 'accepted', 'rejected', 'postponed', 'converted', 'cancelled');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('direct_sale', 'gym_setup', 'supply_only', 'supply_install', 'later_addition');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'prospect',
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "taxNumber" TEXT,
    "commercialRegister" TEXT,
    "source" "CustomerSource",
    "notes" TEXT,
    "responsibleUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "department" "ContactDepartment",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "responsibleUserId" TEXT,
    "source" "CustomerSource",
    "type" "DealType" NOT NULL,
    "estimatedValue" DECIMAL(65,30),
    "expectedCloseDate" TIMESTAMP(3),
    "status" "DealStatus" NOT NULL DEFAULT 'interested',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_type_idx" ON "Customer"("type");

-- CreateIndex
CREATE INDEX "Customer_responsibleUserId_idx" ON "Customer"("responsibleUserId");

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_number_key" ON "Deal"("number");

-- CreateIndex
CREATE INDEX "Deal_customerId_idx" ON "Deal"("customerId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_responsibleUserId_idx" ON "Deal"("responsibleUserId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
