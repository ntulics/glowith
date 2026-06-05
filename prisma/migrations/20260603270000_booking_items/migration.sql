ALTER TABLE "Booking" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "BookingItem" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
