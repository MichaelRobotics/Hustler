-- Step 1: Add subscription column to users table
ALTER TABLE "users" 
ADD COLUMN "subscription" subscription_type;

-- Step 2: Migrate existing subscription data from experiences to users
-- Copy experience subscription to all users in that experience
UPDATE "users" u
SET "subscription" = e."subscription"
FROM "experiences" e
WHERE u."experience_id" = e."id" 
  AND e."subscription" IS NOT NULL;

-- Step 3: Remove subscription column from experiences table
ALTER TABLE "experiences" 
DROP COLUMN "subscription";


