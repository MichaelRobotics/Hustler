-- Add user_id field to conversations table
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_id" uuid;

-- Add foreign key constraint
ALTER TABLE "conversations" ADD CONSTRAINT IF NOT EXISTS "conversations_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Add index for user_id
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" USING btree ("user_id");

-- Add unique constraint for one active conversation per user per experience
-- Note: This will be added after we populate the user_id field
-- ALTER TABLE "conversations" ADD CONSTRAINT "unique_active_user_conversation" UNIQUE("experience_id","user_id");

-- Update existing conversations to set user_id from metadata
-- This is a one-time migration for existing data
UPDATE conversations 
SET user_id = (
  SELECT u.id 
  FROM users u 
  WHERE u.whop_user_id = conversations.metadata->>'whopUserId'
  AND u.experience_id = conversations.experience_id
  LIMIT 1
)
WHERE conversations.metadata->>'whopUserId' IS NOT NULL
AND conversations.user_id IS NULL;

-- For admin-triggered conversations, set user_id to the admin user
-- (assuming admin user has a specific whop_user_id pattern or we can identify them)
UPDATE conversations 
SET user_id = (
  SELECT u.id 
  FROM users u 
  WHERE u.access_level = 'admin'
  AND u.experience_id = conversations.experience_id
  LIMIT 1
)
WHERE conversations.metadata->>'adminTriggered' = 'true'
AND conversations.user_id IS NULL;

-- Now add the unique constraint after populating user_id
ALTER TABLE "conversations" ADD CONSTRAINT IF NOT EXISTS "unique_active_user_conversation" 
UNIQUE("experience_id","user_id");

-- Make user_id NOT NULL after populating it
ALTER TABLE "conversations" ALTER COLUMN "user_id" SET NOT NULL;


