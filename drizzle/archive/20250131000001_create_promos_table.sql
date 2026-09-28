-- Create promo type enum
CREATE TYPE IF NOT EXISTS "promo_type" AS ENUM ('percentage', 'flat_amount');

-- Create promos table
CREATE TABLE IF NOT EXISTS "promos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE,
  "whop_promo_id" text,
  "code" text NOT NULL,
  "amount_off" numeric(10, 2) NOT NULL,
  "base_currency" text NOT NULL,
  "company_id" text NOT NULL,
  "new_users_only" boolean NOT NULL,
  "promo_duration_months" integer NOT NULL,
  "promo_type" "promo_type" NOT NULL,
  "churned_users_only" boolean,
  "existing_memberships_only" boolean,
  "expires_at" timestamp,
  "one_per_customer" boolean,
  "plan_ids" jsonb,
  "product_id" text,
  "stock" integer,
  "unlimited_stock" boolean,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "promos_experience_id_idx" ON "promos"("experience_id");
CREATE INDEX IF NOT EXISTS "promos_code_idx" ON "promos"("code");
CREATE INDEX IF NOT EXISTS "promos_whop_promo_id_idx" ON "promos"("whop_promo_id");
CREATE INDEX IF NOT EXISTS "promos_company_id_idx" ON "promos"("company_id");
CREATE INDEX IF NOT EXISTS "promos_product_id_idx" ON "promos"("product_id");






