-- Remove user_id field from conversations table
-- This simplifies the conversation model to use only whop_user_id for user identification

-- Remove user_id field and its constraints
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE conversations DROP COLUMN user_id;

-- Update the unique constraint to use whop_user_id instead of user_id
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS unique_active_user_conversation;
ALTER TABLE conversations 
ADD CONSTRAINT unique_active_user_conversation 
UNIQUE (experience_id, whop_user_id);
