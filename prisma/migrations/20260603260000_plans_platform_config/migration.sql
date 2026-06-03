CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'BUSINESS');

ALTER TABLE "ProviderProfile" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'STARTER';

CREATE TABLE "PlatformConfig" (
  "id" TEXT NOT NULL,
  "depositPercent" INTEGER NOT NULL DEFAULT 20,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformConfig" ("id", "depositPercent", "updatedAt")
  VALUES ('global', 20, CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
