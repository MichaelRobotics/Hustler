-- Add isDraft column to funnels table
ALTER TABLE "funnels" ADD COLUMN IF NOT EXISTS "is_draft" boolean DEFAULT false NOT NULL;
