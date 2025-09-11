ALTER TABLE "users" DROP CONSTRAINT "users_whop_user_id_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_level" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_whop_user_experience_unique" UNIQUE("whop_user_id","experience_id");