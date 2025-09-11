-- Add user_id field to conversations table
ALTER TABLE conversations ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add index for user_id for better query performance
CREATE INDEX conversations_user_id_idx ON conversations(user_id);

-- Add unique constraint to prevent multiple active conversations per user per experience
-- This ensures one active conversation per user per experience
ALTER TABLE conversations ADD CONSTRAINT unique_active_user_conversation 
UNIQUE (experience_id, user_id) 
WHERE status = 'active';

-- Add index for the unique constraint
CREATE INDEX conversations_experience_user_active_idx ON conversations(experience_id, user_id) 
WHERE status = 'active';

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


