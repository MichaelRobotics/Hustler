-- Typing as simple boolean: true = show typing animation, false = don't
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_typing" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "admin_typing" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "user_typing_at";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "admin_typing_at";
