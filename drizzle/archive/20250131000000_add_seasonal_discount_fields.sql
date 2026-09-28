-- Add seasonal discount fields to experiences table

-- Create enum for seasonal discount duration type
CREATE TYPE IF NOT EXISTS "seasonal_discount_duration_type" AS ENUM ('one-time', 'forever', 'duration_months');

-- Add seasonal discount fields to experiences table
ALTER TABLE "experiences" 
  ADD COLUMN IF NOT EXISTS "seasonal_discount_id" text,
  ADD COLUMN IF NOT EXISTS "seasonal_discount_promo" text,
  ADD COLUMN IF NOT EXISTS "seasonal_discount_start" timestamp,
  ADD COLUMN IF NOT EXISTS "seasonal_discount_end" timestamp,
  ADD COLUMN IF NOT EXISTS "seasonal_discount_text" text,
  ADD COLUMN IF NOT EXISTS "seasonal_discount_quantity_per_product" integer,
  ADD COLUMN IF NOT EXISTS "seasonal_discount_duration_type" "seasonal_discount_duration_type",
  ADD COLUMN IF NOT EXISTS "seasonal_discount_duration_months" integer;






