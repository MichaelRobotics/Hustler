-- Typing expiry: set timestamp when typing is turned on; after 1 min we treat as false
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_typing_at" timestamp;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "admin_typing_at" timestamp;
