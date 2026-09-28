-- Add whop_product_id field to conversations table
-- This field will store the Whop product ID for product-specific conversations

-- Add the whop_product_id column
ALTER TABLE "conversations" ADD COLUMN "whop_product_id" text;
