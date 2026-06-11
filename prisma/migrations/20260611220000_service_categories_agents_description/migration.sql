-- ServiceCategory
CREATE TABLE IF NOT EXISTS "ServiceCategory" (
  "id"                TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "name"              TEXT NOT NULL,
  "color"             TEXT NOT NULL DEFAULT '#D94472',
  "imageUrl"          TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceCategory_providerProfileId_fkey"
    FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE
);

-- Service: add description and categoryId
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL
  NOT VALID;

-- ServiceAgent join table
CREATE TABLE IF NOT EXISTS "ServiceAgent" (
  "id"        TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "agentId"   TEXT NOT NULL,
  CONSTRAINT "ServiceAgent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceAgent_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE,
  CONSTRAINT "ServiceAgent_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE,
  CONSTRAINT "ServiceAgent_serviceId_agentId_key" UNIQUE ("serviceId", "agentId")
);
