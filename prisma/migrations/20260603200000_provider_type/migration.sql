CREATE TYPE "ProviderType" AS ENUM ('FREELANCER', 'BUSINESS');

ALTER TABLE "ProviderProfile"
  ADD COLUMN "providerType" "ProviderType" NOT NULL DEFAULT 'FREELANCER',
  ADD COLUMN "parentBusinessId" TEXT;

ALTER TABLE "ProviderProfile"
  ADD CONSTRAINT "ProviderProfile_parentBusinessId_fkey"
  FOREIGN KEY ("parentBusinessId") REFERENCES "ProviderProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
