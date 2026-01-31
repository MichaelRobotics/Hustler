-- Drop legacy single-trigger columns (replaced by membership_trigger_type + app_trigger_type and their configs)
DROP INDEX IF EXISTS "funnels_trigger_type_idx";
ALTER TABLE "funnels" DROP COLUMN IF EXISTS "trigger_type";
ALTER TABLE "funnels" DROP COLUMN IF EXISTS "trigger_config";
