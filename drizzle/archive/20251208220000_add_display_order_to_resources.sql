-- Add display_order column to resources table
ALTER TABLE "resources" ADD COLUMN "display_order" integer;

-- Create index on (experience_id, display_order) for efficient sorting
CREATE INDEX "resources_experience_display_order_idx" ON "resources" ("experience_id", "display_order");

-- Set initial displayOrder values based on current updated_at order for existing resources
-- This assigns sequential order numbers starting from 1, grouped by experience_id
WITH ordered_resources AS (
  SELECT 
    id,
    experience_id,
    ROW_NUMBER() OVER (PARTITION BY experience_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM "resources"
)
UPDATE "resources" r
SET display_order = o.rn
FROM ordered_resources o
WHERE r.id = o.id;


