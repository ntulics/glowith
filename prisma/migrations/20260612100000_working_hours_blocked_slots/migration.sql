-- Add workingHoursJson to ProviderProfile
ALTER TABLE "ProviderProfile" ADD COLUMN "workingHoursJson" TEXT;

-- Create BlockedSlot table
CREATE TABLE "BlockedSlot" (
    "id" TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
);

-- FK constraint
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
