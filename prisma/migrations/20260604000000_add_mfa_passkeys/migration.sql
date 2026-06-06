-- AlterTable: add TOTP fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Passkey
CREATE TABLE IF NOT EXISTS "Passkey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Passkey',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
