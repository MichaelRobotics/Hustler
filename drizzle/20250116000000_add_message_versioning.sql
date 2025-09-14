-- Add simple versioning to prevent duplicate loading
-- This helps prevent unnecessary message reloads when messages haven't changed

-- Add version column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add index for better performance on version queries
CREATE INDEX IF NOT EXISTS messages_conversation_version_idx ON messages(conversation_id, version);

-- Add last_message_sync timestamp to conversations for sync checking
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_sync TIMESTAMP DEFAULT NOW();

-- Add index for sync checking
CREATE INDEX IF NOT EXISTS conversations_last_message_sync_idx ON conversations(last_message_sync);

-- Update existing messages to have version 1
UPDATE messages SET version = 1 WHERE version IS NULL;
