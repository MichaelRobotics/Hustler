-- Add offer_purchased_at to conversations: set when payment.succeeded matches current offer; cron uses it for upsell vs downsell.
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "offer_purchased_at" timestamp;
