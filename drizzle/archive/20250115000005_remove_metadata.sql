-- Remove metadata fields from conversations and messages tables
-- This simplifies the schema by removing complex metadata structures

-- Remove metadata column from conversations table
ALTER TABLE conversations DROP COLUMN IF EXISTS metadata;

-- Remove metadata column from messages table  
ALTER TABLE messages DROP COLUMN IF EXISTS metadata;
