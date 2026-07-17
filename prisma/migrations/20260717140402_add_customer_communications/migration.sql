-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('call', 'whatsapp', 'email', 'visit', 'meeting');

-- CreateTable
CREATE TABLE "CustomerCommunication" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "type" "CommunicationType" NOT NULL,
    "summary" TEXT NOT NULL,
    "nextStep" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerCommunication_customerId_idx" ON "CustomerCommunication"("customerId");

-- CreateIndex
CREATE INDEX "CustomerCommunication_nextFollowUpDate_idx" ON "CustomerCommunication"("nextFollowUpDate");

-- AddForeignKey
ALTER TABLE "CustomerCommunication" ADD CONSTRAINT "CustomerCommunication_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCommunication" ADD CONSTRAINT "CustomerCommunication_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
