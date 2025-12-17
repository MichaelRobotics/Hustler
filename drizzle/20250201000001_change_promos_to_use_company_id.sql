-- Change promos table from experience_id to whop_company_id

-- Add whop_company_id column (temporarily nullable for backfill)
ALTER TABLE "promos" 
ADD COLUMN IF NOT EXISTS "whop_company_id" text;

-- Backfill whop_company_id from experiences
UPDATE "promos" p
SET "whop_company_id" = e."whop_company_id"
FROM "experiences" e
WHERE p."experience_id" = e."id"
  AND p."whop_company_id" IS NULL;

-- Make whop_company_id NOT NULL after backfill
ALTER TABLE "promos" 
ALTER COLUMN "whop_company_id" SET NOT NULL;

-- Drop foreign key constraint on experience_id
ALTER TABLE "promos" 
DROP CONSTRAINT IF EXISTS "promos_experience_id_experiences_id_fk";

-- Drop experience_id index
DROP INDEX IF EXISTS "promos_experience_id_idx";

-- Drop experience_id column
ALTER TABLE "promos" 
DROP COLUMN IF EXISTS "experience_id";

-- Create index on whop_company_id
CREATE INDEX IF NOT EXISTS "promos_whop_company_id_idx" ON "promos"("whop_company_id");

-- Add comment
COMMENT ON COLUMN "promos"."whop_company_id" IS 'Whop company ID for querying promos by company';



