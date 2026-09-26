-- One-time discount panel fields, scoped to an experience and product.

CREATE TABLE IF NOT EXISTS one_time_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  promo_code TEXT NOT NULL DEFAULT '',
  target_product_id TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT one_time_discounts_discount_type_check CHECK (discount_type IN ('percentage', 'fixed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS one_time_discounts_experience_product_unique
  ON one_time_discounts(experience_id, product_id);

CREATE INDEX IF NOT EXISTS one_time_discounts_experience_id_idx
  ON one_time_discounts(experience_id);
