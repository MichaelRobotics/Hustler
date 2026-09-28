-- Add metadata column to messages for LiveChat admin senderType (and other optional payload)
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
