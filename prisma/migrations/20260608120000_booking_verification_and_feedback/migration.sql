ALTER TABLE "Booking" ADD COLUMN "checkInCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN "checkInCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "feedbackRequestedAt" TIMESTAMP(3);
