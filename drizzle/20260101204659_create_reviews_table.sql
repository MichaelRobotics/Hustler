-- Create review status enum
CREATE TYPE IF NOT EXISTS "review_status" AS ENUM ('pending', 'published', 'removed');

-- Create reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "experience_id" uuid NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE,
  "resource_id" uuid REFERENCES "resources"("id") ON DELETE CASCADE,
  "whop_product_id" text NOT NULL,
  "whop_review_id" text NOT NULL UNIQUE,
  "title" text,
  "description" text,
  "stars" integer NOT NULL,
  "status" "review_status" NOT NULL,
  "paid_for_product" boolean,
  "user_id" text NOT NULL,
  "user_name" text,
  "user_username" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "published_at" timestamp,
  "joined_at" timestamp
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "reviews_whop_review_id_idx" ON "reviews"("whop_review_id");
CREATE INDEX IF NOT EXISTS "reviews_whop_product_id_idx" ON "reviews"("whop_product_id");
CREATE INDEX IF NOT EXISTS "reviews_experience_id_idx" ON "reviews"("experience_id");
CREATE INDEX IF NOT EXISTS "reviews_resource_id_idx" ON "reviews"("resource_id");


