-- Remove handout keyword/config (handover is now on any user message)
ALTER TABLE "funnels" DROP COLUMN IF EXISTS "handout_keyword";
ALTER TABLE "funnels" DROP COLUMN IF EXISTS "handout_admin_notification";
ALTER TABLE "funnels" DROP COLUMN IF EXISTS "handout_user_message";
