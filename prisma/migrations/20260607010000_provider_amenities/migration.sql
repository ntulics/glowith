-- CreateTable: ProviderAmenity
CREATE TABLE "ProviderAmenity" (
    "id"                TEXT NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "amenityKey"        TEXT NOT NULL,
    "value"             TEXT,

    CONSTRAINT "ProviderAmenity_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex: one row per provider per amenity key
CREATE UNIQUE INDEX "ProviderAmenity_providerProfileId_amenityKey_key"
    ON "ProviderAmenity"("providerProfileId", "amenityKey");

-- FK → ProviderProfile (cascade delete)
ALTER TABLE "ProviderAmenity"
    ADD CONSTRAINT "ProviderAmenity_providerProfileId_fkey"
    FOREIGN KEY ("providerProfileId")
    REFERENCES "ProviderProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
