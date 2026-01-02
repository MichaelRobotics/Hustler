-- Add membership_product_id column to customers_resources table
ALTER TABLE "customers_resources" ADD COLUMN IF NOT EXISTS "membership_product_id" text;

-- Create index for membership_product_id
CREATE INDEX IF NOT EXISTS "customers_resources_membership_product_id_idx" ON "customers_resources"("membership_product_id");







