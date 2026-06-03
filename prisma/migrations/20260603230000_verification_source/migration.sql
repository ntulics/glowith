-- Verification source: who verified this provider
CREATE TYPE "VerificationSource" AS ENUM ('GLOWITH', 'EMPLOYER');

ALTER TABLE "ProviderProfile" ADD COLUMN "verifiedBy" "VerificationSource";
ALTER TABLE "ProviderProfile" ADD COLUMN "canPostToCompany" BOOLEAN NOT NULL DEFAULT false;

-- Portfolio post authorship (company posts may be authored by an agent)
ALTER TABLE "PortfolioPost" ADD COLUMN "authorProfileId" TEXT;
ALTER TABLE "PortfolioPost" ADD COLUMN "authorName" TEXT;

-- Existing verified profiles were verified by Glowith
UPDATE "ProviderProfile" SET "verifiedBy" = 'GLOWITH' WHERE "verified" = true;
