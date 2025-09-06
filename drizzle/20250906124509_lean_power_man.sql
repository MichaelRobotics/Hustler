CREATE INDEX "experiences_updated_at_idx" ON "experiences" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "funnels_experience_user_updated_idx" ON "funnels" USING btree ("experience_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "funnels_experience_deployed_idx" ON "funnels" USING btree ("experience_id","is_deployed");--> statement-breakpoint
CREATE INDEX "resources_experience_user_updated_idx" ON "resources" USING btree ("experience_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "resources_type_category_idx" ON "resources" USING btree ("type","category");--> statement-breakpoint
CREATE INDEX "users_experience_updated_idx" ON "users" USING btree ("experience_id","updated_at");