ALTER TABLE "ProviderProfile" ADD COLUMN "storageBytes" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "ProviderProfile" ADD COLUMN "storageQuotaBytes" BIGINT NOT NULL DEFAULT 2147483648;
UPDATE "ProviderProfile" SET "storageQuotaBytes" = 21474836480 WHERE "providerType" = 'BUSINESS';
ALTER TABLE "PortfolioPost" ADD COLUMN "sizeBytes" INTEGER NOT NULL DEFAULT 0;
