-- Update funnel trigger type enum with new trigger types
ALTER TYPE "funnel_trigger_type" ADD VALUE IF NOT EXISTS 'any_membership_buy';
ALTER TYPE "funnel_trigger_type" ADD VALUE IF NOT EXISTS 'membership_buy';
ALTER TYPE "funnel_trigger_type" ADD VALUE IF NOT EXISTS 'no_active_conversation';
ALTER TYPE "funnel_trigger_type" ADD VALUE IF NOT EXISTS 'qualification_merchant_complete';
ALTER TYPE "funnel_trigger_type" ADD VALUE IF NOT EXISTS 'upsell_merchant_complete';

-- Add trigger_config JSONB column to funnels table
ALTER TABLE "funnels" ADD COLUMN IF NOT EXISTS "trigger_config" JSONB DEFAULT '{}';

-- Add delay_minutes integer column to funnels table
ALTER TABLE "funnels" ADD COLUMN IF NOT EXISTS "delay_minutes" INTEGER DEFAULT 0 NOT NULL;


