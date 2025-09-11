-- Add access level to users table following WHOP best practices
-- This stores the access level (admin/customer/no_access) to avoid repeated API calls

ALTER TABLE "users" ADD COLUMN "access_level" text NOT NULL DEFAULT 'customer';

-- Add index for faster access level queries
CREATE INDEX "users_access_level_idx" ON "users" ("access_level");

-- Add index for experience + access level queries (common pattern)
CREATE INDEX "users_experience_access_level_idx" ON "users" ("experience_id", "access_level");

-- Update existing users to have 'customer' access level (safe default)
-- Admin users will be updated when they next authenticate
UPDATE "users" SET "access_level" = 'customer' WHERE "access_level" = 'customer';
