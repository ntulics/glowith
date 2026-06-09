-- Fix JobPosting column mismatches from initial migration
-- salary TEXT -> salaryCents INT, active -> published

ALTER TABLE "JobPosting"
  DROP COLUMN IF EXISTS "salary",
  ADD COLUMN IF NOT EXISTS "salaryCents" INTEGER;

ALTER TABLE "JobPosting"
  RENAME COLUMN "active" TO "published";
