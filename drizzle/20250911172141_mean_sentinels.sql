ALTER TABLE "users" ADD COLUMN "access_level" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
CREATE INDEX "users_access_level_idx" ON "users" USING btree ("access_level");--> statement-breakpoint
CREATE INDEX "users_experience_access_level_idx" ON "users" USING btree ("experience_id","access_level");