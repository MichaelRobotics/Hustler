-- Simplify message types by removing 'system' type
-- Update existing 'system' messages to 'bot' type

-- Update existing system messages to bot type
UPDATE messages 
SET type = 'bot' 
WHERE type = 'system';

-- Drop the old enum and recreate with simplified types
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_message_type_check;
DROP TYPE IF EXISTS message_type CASCADE;

-- Recreate the enum with only user and bot types
CREATE TYPE message_type AS ENUM('user', 'bot');

-- Add the constraint back
ALTER TABLE messages ADD CONSTRAINT messages_type_message_type_check 
CHECK (type::text = ANY (ARRAY['user'::text, 'bot'::text]));
