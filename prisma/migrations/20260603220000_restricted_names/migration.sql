CREATE TABLE "RestrictedName" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  CONSTRAINT "RestrictedName_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RestrictedName_name_key" ON "RestrictedName"("name");
