-- Make whop_product_id nullable and add plan_id column to reviews table
ALTER TABLE "reviews" ALTER COLUMN "whop_product_id" DROP NOT NULL;

-- Add plan_id column
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "plan_id" text;

-- Create index on plan_id
CREATE INDEX IF NOT EXISTS "reviews_plan_id_idx" ON "reviews"("plan_id");


