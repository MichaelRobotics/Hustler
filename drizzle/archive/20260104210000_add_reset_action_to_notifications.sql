-- Add resetAction and delayMinutes columns to funnel_notifications table
ALTER TABLE "funnel_notifications" ADD COLUMN IF NOT EXISTS "reset_action" text;
ALTER TABLE "funnel_notifications" ADD COLUMN IF NOT EXISTS "delay_minutes" integer;


