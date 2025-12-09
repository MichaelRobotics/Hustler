-- Remove resource type field and enum
-- Drop indexes that include type field
DROP INDEX IF EXISTS "resources_type_idx";
DROP INDEX IF EXISTS "resources_type_category_idx";

-- Make link column nullable (was notNull)
ALTER TABLE "resources" 
ALTER COLUMN "link" DROP NOT NULL;

-- Drop the type column
ALTER TABLE "resources" 
DROP COLUMN IF EXISTS "type";

-- Drop the resource_type enum (only if no other tables use it)
-- Note: This will fail if the enum is used elsewhere, which is fine
DROP TYPE IF EXISTS "resource_type";



