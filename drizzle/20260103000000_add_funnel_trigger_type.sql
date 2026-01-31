-- Add funnel trigger type enum
CREATE TYPE "funnel_trigger_type" AS ENUM('on_app_entry', 'membership_valid');

-- Add trigger_type column to funnels table with default value
ALTER TABLE "funnels" ADD COLUMN "trigger_type" "funnel_trigger_type" DEFAULT 'on_app_entry' NOT NULL;

-- Create index for trigger_type
CREATE INDEX "funnels_trigger_type_idx" ON "funnels" ("trigger_type");




