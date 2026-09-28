-- Add 'archived' to conversation_status enum (only place that sets archived is notification "delete conversation")
ALTER TYPE "public"."conversation_status" ADD VALUE IF NOT EXISTS 'archived';

-- Drop unique constraint so multiple conversations per user per experience are allowed (one active, many closed/archived)
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "unique_active_user_conversation";
