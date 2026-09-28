-- Add new trigger types to enum
ALTER TYPE "funnel_trigger_type" ADD VALUE IF NOT EXISTS 'delete_merchant_conversation';
ALTER TYPE "funnel_trigger_type" ADD VALUE IF NOT EXISTS 'cancel_membership';

-- Add new columns for multiple trigger support
ALTER TABLE "funnels" ADD COLUMN IF NOT EXISTS "membership_trigger_type" "funnel_trigger_type";
ALTER TABLE "funnels" ADD COLUMN IF NOT EXISTS "app_trigger_type" "funnel_trigger_type";

-- Add trigger config columns for each trigger type
-- Note: triggerConfig JSONB already exists, we'll use membershipTriggerConfig and appTriggerConfig
-- For now, we can extend triggerConfig JSONB or add separate columns
-- Using JSONB approach: triggerConfig can store { membership: {...}, app: {...} } or separate fields

-- Add indexes for new trigger type columns
CREATE INDEX IF NOT EXISTS "funnels_membership_trigger_type_idx" ON "funnels"("membership_trigger_type");
CREATE INDEX IF NOT EXISTS "funnels_app_trigger_type_idx" ON "funnels"("app_trigger_type");
