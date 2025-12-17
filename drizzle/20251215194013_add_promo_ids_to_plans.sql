-- Add promo_ids column to plans table
ALTER TABLE plans ADD COLUMN promo_ids JSONB;

-- Create GIN index for efficient JSONB queries
CREATE INDEX plans_promo_ids_idx ON plans USING GIN (promo_ids);





