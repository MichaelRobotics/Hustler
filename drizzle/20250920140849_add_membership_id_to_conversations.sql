ALTER TABLE "funnel_resource_analytics" DROP CONSTRAINT "unique_funnel_resource";--> statement-breakpoint
DROP INDEX "funnel_resource_analytics_experience_id_idx";--> statement-breakpoint
DROP INDEX "funnel_resource_analytics_funnel_id_idx";--> statement-breakpoint
DROP INDEX "funnel_resource_analytics_resource_id_idx";--> statement-breakpoint
DROP INDEX "funnel_resource_analytics_last_updated_idx";--> statement-breakpoint
DROP INDEX "funnel_resource_analytics_total_revenue_idx";--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "membership_id" text;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_intent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_interest" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_intent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_interest" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "yesterday_starts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "yesterday_intent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "yesterday_conversions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "yesterday_interest" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "starts_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "intent_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "conversions_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "interest_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD COLUMN "total_interest" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD COLUMN "today_interest" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "total_completions";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "total_free_clicks";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "today_completions";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "today_free_clicks";--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" DROP COLUMN "total_free_clicks";--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" DROP COLUMN "today_free_clicks";