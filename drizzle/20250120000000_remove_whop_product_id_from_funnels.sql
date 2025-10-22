-- Remove whop_product_id field and unused indexes from funnels table
-- This removes the unused product association that was never actually used for funnel selection

-- Drop unused indexes first
DROP INDEX IF EXISTS funnels_whop_product_id_idx;
DROP INDEX IF EXISTS funnels_experience_product_deployed_idx;

-- Remove the whop_product_id column
ALTER TABLE funnels DROP COLUMN IF EXISTS whop_product_id;






































