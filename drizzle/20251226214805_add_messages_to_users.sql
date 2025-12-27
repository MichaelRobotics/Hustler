-- Add messages column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "messages" integer DEFAULT 0 NOT NULL;


