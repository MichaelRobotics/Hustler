-- Add unread counts and controlled_by for handover/notifications
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "unread_count_admin" integer DEFAULT 0 NOT NULL;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "unread_count_user" integer DEFAULT 0 NOT NULL;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "controlled_by" text DEFAULT 'bot' NOT NULL;
