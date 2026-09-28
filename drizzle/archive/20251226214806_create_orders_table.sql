-- Create orders table
CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "whop_company_id" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "plan_id" text,
  "prod_id" text,
  "prod_name" text NOT NULL,
  "payment_id" text NOT NULL,
  "access_level" text NOT NULL,
  "avatar" text,
  "user_name" text NOT NULL,
  "email" text NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "messages" integer,
  "credits" integer,
  "subscription" subscription_type,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for orders table
CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders"("user_id");
CREATE INDEX IF NOT EXISTS "orders_whop_company_id_idx" ON "orders"("whop_company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_payment_id_unique" ON "orders"("payment_id");
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX IF NOT EXISTS "orders_company_created_idx" ON "orders"("whop_company_id", "created_at");


