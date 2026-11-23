-- CreateEnum
CREATE TYPE "FeeKind" AS ENUM ('TAX', 'CAUTION_DEPOSIT', 'CLEANING', 'SERVICE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FeeCalculation" AS ENUM ('FIXED', 'PERCENTAGE', 'VARIABLE');

-- CreateEnum
CREATE TYPE "FeeAppliesTo" AS ENUM ('PER_STAY', 'PER_NIGHT', 'PER_GUEST');

-- CreateEnum
CREATE TYPE "ReservationPaymentOption" AS ENUM ('PAY_NOW', 'PAY_LATER');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "allowPayLater" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unpaidHoldDays" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "appliedFees" JSONB,
ADD COLUMN     "cautionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentOption" "ReservationPaymentOption" NOT NULL DEFAULT 'PAY_NOW',
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PropertyFee" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FeeKind" NOT NULL DEFAULT 'CUSTOM',
    "calculation" "FeeCalculation" NOT NULL DEFAULT 'FIXED',
    "amount" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "appliesTo" "FeeAppliesTo" NOT NULL DEFAULT 'PER_STAY',
    "isRefundable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyFee_propertyId_isActive_idx" ON "PropertyFee"("propertyId", "isActive");

-- AddForeignKey
ALTER TABLE "PropertyFee" ADD CONSTRAINT "PropertyFee_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
