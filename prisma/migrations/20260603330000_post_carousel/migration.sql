ALTER TABLE "PortfolioPost" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT '{}';
-- Backfill: existing single-image posts become a 1-image carousel
UPDATE "PortfolioPost" SET "images" = ARRAY["imageUrl"] WHERE array_length("images", 1) IS NULL;
