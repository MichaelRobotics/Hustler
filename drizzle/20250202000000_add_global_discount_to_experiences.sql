-- Add global_discount field to experiences table

-- Add global_discount column to experiences table
ALTER TABLE "experiences" 
  ADD COLUMN IF NOT EXISTS "global_discount" boolean DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN "experiences"."global_discount" IS 'Whether global discount is enabled (promo applies to all products/plans)';

