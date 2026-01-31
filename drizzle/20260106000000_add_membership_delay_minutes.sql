-- Add membership_delay_minutes column to funnels table
ALTER TABLE "funnels" ADD COLUMN IF NOT EXISTS "membership_delay_minutes" INTEGER DEFAULT 0 NOT NULL;

-- Migrate existing data: copy delay_minutes to membership_delay_minutes for funnels with membership triggers
UPDATE "funnels" 
SET "membership_delay_minutes" = "delay_minutes"
WHERE "membership_trigger_type" IS NOT NULL;
