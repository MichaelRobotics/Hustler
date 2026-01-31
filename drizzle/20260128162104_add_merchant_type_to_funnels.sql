-- Add merchant_type column to funnels table
ALTER TABLE "funnels" 
ADD COLUMN IF NOT EXISTS "merchant_type" text NOT NULL DEFAULT 'qualification';

-- Add comment for documentation
COMMENT ON COLUMN "funnels"."merchant_type" IS 'Merchant type: "qualification" or "upsell"';
