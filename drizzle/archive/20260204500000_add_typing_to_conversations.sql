-- Typing indicator on conversation: consider "typing" if timestamp within last ~5s
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_typing_at" timestamp;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "admin_typing_at" timestamp;
