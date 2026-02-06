-- Add read receipt timestamps to conversations
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_last_read_at" timestamp;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "admin_last_read_at" timestamp;
