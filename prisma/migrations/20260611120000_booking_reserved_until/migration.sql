-- Add reservedUntil to Booking so PENDING_DEPOSIT slots can expire
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "reservedUntil" TIMESTAMP(3);

-- Index for fast expiry cleanup queries
CREATE INDEX IF NOT EXISTS "Booking_reservedUntil_idx" ON "Booking"("reservedUntil");
