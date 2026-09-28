-- Drop deprecated trigger_timeout_minutes from funnels (unused; prefer delay_minutes / membership_delay_minutes)
ALTER TABLE "funnels" DROP COLUMN IF EXISTS "trigger_timeout_minutes";
