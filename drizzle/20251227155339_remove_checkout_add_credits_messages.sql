-- Remove checkout_id and internal_checkout_id columns from subscriptions table
-- Add credits and messages columns for plan metadata

-- Drop unique constraints on checkout columns (these create indexes)
ALTER TABLE "subscriptions" 
DROP CONSTRAINT IF EXISTS "subscriptions_checkout_id_unique",
DROP CONSTRAINT IF EXISTS "subscriptions_internal_checkout_id_unique";

-- Remove checkout columns
ALTER TABLE "subscriptions" 
DROP COLUMN IF EXISTS "checkout_id",
DROP COLUMN IF EXISTS "internal_checkout_id";

-- Add credits and messages columns (nullable decimals)
ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "credits" numeric(10, 2),
ADD COLUMN IF NOT EXISTS "messages" numeric(10, 2);

