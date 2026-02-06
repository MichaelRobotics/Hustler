-- Add currentBlockEnteredAt and lastNotificationSequenceSent to conversations for notification / inactivity tracking
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "current_block_entered_at" timestamp;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "last_notification_sequence_sent" integer;
