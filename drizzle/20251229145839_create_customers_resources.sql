-- Create customers_resources table
CREATE TABLE IF NOT EXISTS "customers_resources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" text NOT NULL,
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_name" text NOT NULL,
  "membership_plan_id" text NOT NULL,
  "download_link" text,
  "product_name" text NOT NULL,
  "description" text,
  "image" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for customers_resources table
CREATE INDEX IF NOT EXISTS "customers_resources_experience_id_idx" ON "customers_resources"("experience_id");
CREATE INDEX IF NOT EXISTS "customers_resources_user_id_idx" ON "customers_resources"("user_id");
CREATE INDEX IF NOT EXISTS "customers_resources_company_id_idx" ON "customers_resources"("company_id");
CREATE INDEX IF NOT EXISTS "customers_resources_membership_plan_id_idx" ON "customers_resources"("membership_plan_id");




