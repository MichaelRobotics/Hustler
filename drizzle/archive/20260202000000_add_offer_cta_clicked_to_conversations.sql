-- Add offer CTA clicked columns for upsell/downsell timer (Option A)
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "offer_cta_clicked_at" timestamp;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "offer_cta_block_id" text;
