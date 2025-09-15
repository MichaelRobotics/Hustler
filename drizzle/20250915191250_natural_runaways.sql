ALTER TABLE "conversations" DROP CONSTRAINT "unique_active_user_conversation";--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."message_type";--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('user', 'bot');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "type" SET DATA TYPE "public"."message_type" USING "type"::"public"."message_type";--> statement-breakpoint
DROP INDEX "conversations_user_id_idx";--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "phase2_start_time" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "unique_active_user_conversation" UNIQUE("experience_id","whop_user_id");