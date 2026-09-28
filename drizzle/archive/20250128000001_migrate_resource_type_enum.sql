-- Migration to convert resource_type enum from MY_PRODUCTS/AFFILIATE to LINK/FILE
-- This must be run BEFORE drizzle-kit push

-- Step 1: Convert enum column to text temporarily
ALTER TABLE "resources" ALTER COLUMN "type" SET DATA TYPE text;

-- Step 2: Migrate old enum values to new values
UPDATE "resources" 
SET "type" = CASE
  -- Convert old enum values: MY_PRODUCTS and AFFILIATE both become LINK (they both have links)
  WHEN "type" IN ('MY_PRODUCTS', 'AFFILIATE') THEN 'LINK'
  -- If type is already LINK or FILE, keep it
  WHEN "type" IN ('LINK', 'FILE') THEN "type"
  -- If type is NULL, infer from data
  WHEN "link" IS NOT NULL AND "link" != '' AND ("storage_url" IS NULL OR "storage_url" = '') THEN 'LINK'
  WHEN "storage_url" IS NOT NULL AND "storage_url" != '' AND ("link" IS NULL OR "link" = '') THEN 'FILE'
  WHEN "link" IS NOT NULL AND "link" != '' AND "storage_url" IS NOT NULL AND "storage_url" != '' THEN 'LINK'
  -- Default to LINK if we can't determine
  ELSE 'LINK'
END;

-- Step 3: Drop old enum
DROP TYPE IF EXISTS "public"."resource_type";

-- Step 4: Create new enum with LINK and FILE values
CREATE TYPE "public"."resource_type" AS ENUM('LINK', 'FILE');

-- Step 5: Convert type column to use new enum
ALTER TABLE "resources" ALTER COLUMN "type" SET DATA TYPE "public"."resource_type" USING "type"::"public"."resource_type";

-- Step 6: Make type NOT NULL
ALTER TABLE "resources" ALTER COLUMN "type" SET NOT NULL;

-- Step 7: Re-add indexes
CREATE INDEX IF NOT EXISTS "resources_type_idx" ON "resources" ("type");
CREATE INDEX IF NOT EXISTS "resources_type_category_idx" ON "resources" ("type", "category");


