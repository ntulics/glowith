-- Idempotent safety net in case an earlier migration didn't apply cleanly.
ALTER TABLE "PortfolioPost" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PortfolioPost" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "storageBytes" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "storageQuotaBytes" BIGINT NOT NULL DEFAULT 2147483648;
