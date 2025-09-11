ALTER TABLE "conversations" ADD COLUMN "whop_user_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "conversations_whop_user_id_idx" ON "conversations" USING btree ("whop_user_id");