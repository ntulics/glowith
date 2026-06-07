-- ServiceExtra: optional add-ons a customer can include with a service
CREATE TABLE "ServiceExtra" (
  "id"              TEXT NOT NULL,
  "serviceId"       TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "priceCents"      INTEGER NOT NULL DEFAULT 0,
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "active"          BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceExtra_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServiceExtra" ADD CONSTRAINT "ServiceExtra_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BookingExtra: extras that were added to a booking
CREATE TABLE "BookingExtra" (
  "id"              TEXT NOT NULL,
  "bookingId"       TEXT NOT NULL,
  "serviceExtraId"  TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "priceCents"      INTEGER NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BookingExtra_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BookingExtra" ADD CONSTRAINT "BookingExtra_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingExtra" ADD CONSTRAINT "BookingExtra_serviceExtraId_fkey"
  FOREIGN KEY ("serviceExtraId") REFERENCES "ServiceExtra"("id") ON UPDATE CASCADE;

-- Cancellation & reschedule policy on ProviderProfile (agents inherit from parent)
ALTER TABLE "ProviderProfile" ADD COLUMN "cancelNoticeHours"     INTEGER;
ALTER TABLE "ProviderProfile" ADD COLUMN "cancelFeePercent"      INTEGER;
ALTER TABLE "ProviderProfile" ADD COLUMN "rescheduleNoticeHours" INTEGER;
ALTER TABLE "ProviderProfile" ADD COLUMN "rescheduleFeePercent"  INTEGER;
ALTER TABLE "ProviderProfile" ADD COLUMN "policyText"            TEXT;
