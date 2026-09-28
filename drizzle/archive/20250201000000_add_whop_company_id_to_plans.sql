-- Add whop_company_id to plans table

-- Add whop_company_id column (temporarily nullable for backfill)
ALTER TABLE "plans" 
ADD COLUMN IF NOT EXISTS "whop_company_id" text;

-- Backfill whop_company_id from resources -> experiences
UPDATE "plans" p
SET "whop_company_id" = e."whop_company_id"
FROM "resources" r
JOIN "experiences" e ON r."experience_id" = e."id"
WHERE p."resource_id" = r."id"
  AND p."whop_company_id" IS NULL;

-- Make whop_company_id NOT NULL after backfill
ALTER TABLE "plans" 
ALTER COLUMN "whop_company_id" SET NOT NULL;

-- Create index on whop_company_id
CREATE INDEX IF NOT EXISTS "plans_whop_company_id_idx" ON "plans"("whop_company_id");

-- Add comment
COMMENT ON COLUMN "plans"."whop_company_id" IS 'Whop company ID for querying plans by company';





