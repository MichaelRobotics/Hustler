-- Add Plans table and update resources table with plan-related fields

-- Create plans table
CREATE TABLE IF NOT EXISTS "plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "resource_id" uuid NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
  "whop_product_id" text,
  "checkout_configuration_id" text,
  "plan_id" text NOT NULL UNIQUE,
  "purchase_url" text,
  "initial_price" numeric(10, 2),
  "renewal_price" numeric(10, 2),
  "currency" text,
  "plan_type" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "plans_mutual_exclusivity" CHECK (
    ("whop_product_id" IS NULL) != ("checkout_configuration_id" IS NULL)
  )
);

-- Create indexes for plans table
CREATE INDEX IF NOT EXISTS "plans_resource_id_idx" ON "plans"("resource_id");
CREATE INDEX IF NOT EXISTS "plans_whop_product_id_idx" ON "plans"("whop_product_id");
CREATE INDEX IF NOT EXISTS "plans_checkout_configuration_id_idx" ON "plans"("checkout_configuration_id");
CREATE INDEX IF NOT EXISTS "plans_plan_id_idx" ON "plans"("plan_id");

-- Add plan-related fields to resources table
ALTER TABLE "resources" 
ADD COLUMN IF NOT EXISTS "plan_id" text,
ADD COLUMN IF NOT EXISTS "purchase_url" text,
ADD COLUMN IF NOT EXISTS "checkout_configuration_id" text;

-- Create index for checkout_configuration_id in resources table
CREATE INDEX IF NOT EXISTS "resources_checkout_configuration_id_idx" ON "resources"("checkout_configuration_id");

-- Add check constraint for resources table (mutual exclusivity for PAID resources)
-- Note: This constraint only applies to PAID resources
-- We use a function-based check that allows NULL for both in FREE_VALUE resources
ALTER TABLE "resources"
ADD CONSTRAINT "resources_paid_mutual_exclusivity" CHECK (
  "category" != 'PAID' OR 
  ("whop_product_id" IS NULL) != ("checkout_configuration_id" IS NULL)
);

-- Add comments for documentation
COMMENT ON TABLE "plans" IS 'Stores Whop plan data tied to resources. Plans are either tied to a product (whop_product_id) or a checkout configuration (checkout_configuration_id), but not both.';
COMMENT ON COLUMN "plans"."whop_product_id" IS 'Whop product ID for plans tied to products. NULL if tied to checkout configuration.';
COMMENT ON COLUMN "plans"."checkout_configuration_id" IS 'Checkout configuration ID for plans created via checkout. NULL if tied to product.';
COMMENT ON COLUMN "resources"."plan_id" IS 'Whop plan ID associated with this resource';
COMMENT ON COLUMN "resources"."purchase_url" IS 'Purchase URL from plan or checkout configuration';
COMMENT ON COLUMN "resources"."checkout_configuration_id" IS 'Checkout configuration ID for resources created via checkout. NULL if tied to product.';





