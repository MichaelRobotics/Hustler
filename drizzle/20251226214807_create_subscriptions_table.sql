-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "checkout_id" text NOT NULL,
  "internal_checkout_id" text NOT NULL,
  "plan_id" text NOT NULL,
  "type" text NOT NULL,
  "amount" numeric(10, 2),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for subscriptions table
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_checkout_id_unique" ON "subscriptions"("checkout_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_internal_checkout_id_unique" ON "subscriptions"("internal_checkout_id");
CREATE INDEX IF NOT EXISTS "subscriptions_type_idx" ON "subscriptions"("type");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");
CREATE INDEX IF NOT EXISTS "subscriptions_type_amount_idx" ON "subscriptions"("type", "amount");


