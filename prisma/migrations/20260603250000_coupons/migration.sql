CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discountType" "DiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "maxRedemptions" INTEGER,
  "redemptions" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_providerProfileId_code_key" ON "Coupon"("providerProfileId", "code");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_providerProfileId_fkey"
  FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD COLUMN "couponId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
