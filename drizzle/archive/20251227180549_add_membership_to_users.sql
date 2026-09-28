-- Add membership field to users table for storing Whop membership IDs
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "membership" text;

-- Create index on membership field for lookups
CREATE INDEX IF NOT EXISTS "users_membership_idx" ON "users" ("membership");

