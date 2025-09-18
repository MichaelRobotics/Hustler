-- Add whop_product_id field to funnels table for product-specific funnel association
-- This enables one live funnel per product per experience

-- Add the new column
ALTER TABLE funnels ADD COLUMN whop_product_id TEXT;

-- Add indexes for efficient queries
CREATE INDEX funnels_whop_product_id_idx ON funnels(whop_product_id);
CREATE INDEX funnels_experience_product_deployed_idx ON funnels(experience_id, whop_product_id, is_deployed);

-- Optional: Set default for existing funnels (they will be legacy funnels without product association)
UPDATE funnels SET whop_product_id = 'legacy' WHERE whop_product_id IS NULL;

