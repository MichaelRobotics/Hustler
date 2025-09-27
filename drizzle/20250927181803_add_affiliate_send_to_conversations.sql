-- Add affiliate_send field to conversations table
ALTER TABLE "conversations" ADD COLUMN "affiliate_send" boolean DEFAULT false NOT NULL;
