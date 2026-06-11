-- Add verificationFee to PlatformConfig
ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "verificationFee" INTEGER NOT NULL DEFAULT 15000;

-- Enums
DO $$ BEGIN
  CREATE TYPE "VerificationDocType" AS ENUM ('GOV_ID', 'PROOF_OF_ADDRESS', 'PROOF_OF_BANK');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VerificationTrigger" AS ENUM ('INITIAL', 'BUSINESS_NAME_CHANGE', 'BANKING_CHANGE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- VerificationRequest
CREATE TABLE IF NOT EXISTS "VerificationRequest" (
  "id"                TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "status"            "VerificationStatus"  NOT NULL DEFAULT 'PENDING',
  "trigger"           "VerificationTrigger" NOT NULL DEFAULT 'INITIAL',
  "feeCents"          INTEGER NOT NULL,
  "paymentRef"        TEXT,
  "paid"              BOOLEAN NOT NULL DEFAULT false,
  "reviewNotes"       TEXT,
  "reviewedAt"        TIMESTAMP(3),
  "reviewedById"      TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerificationRequest_providerProfileId_fkey"
    FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "VerificationRequest_providerProfileId_idx" ON "VerificationRequest"("providerProfileId");

-- VerificationDocument
CREATE TABLE IF NOT EXISTS "VerificationDocument" (
  "id"                    TEXT NOT NULL,
  "verificationRequestId" TEXT NOT NULL,
  "type"                  "VerificationDocType" NOT NULL,
  "fileUrl"               TEXT NOT NULL,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VerificationDocument_verificationRequestId_fkey"
    FOREIGN KEY ("verificationRequestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE
);
