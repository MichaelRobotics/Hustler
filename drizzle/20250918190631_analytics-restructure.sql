CREATE TABLE "funnel_resource_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"total_resource_clicks" integer DEFAULT 0 NOT NULL,
	"total_resource_conversions" integer DEFAULT 0 NOT NULL,
	"total_resource_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_free_clicks" integer DEFAULT 0 NOT NULL,
	"today_resource_clicks" integer DEFAULT 0 NOT NULL,
	"today_resource_conversions" integer DEFAULT 0 NOT NULL,
	"today_resource_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"today_free_clicks" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_funnel_resource" UNIQUE("funnel_id","resource_id")
);
--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP CONSTRAINT "unique_funnel_date";--> statement-breakpoint
DROP INDEX "funnel_analytics_date_idx";--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_starts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_completions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_conversions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_affiliate_revenue" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_product_revenue" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "total_free_clicks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_starts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_completions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_conversions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_affiliate_revenue" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_product_revenue" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "today_free_clicks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "last_updated" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "funnels" ADD COLUMN "whop_product_id" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "whop_app_id" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "whop_membership_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "products_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD CONSTRAINT "funnel_resource_analytics_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD CONSTRAINT "funnel_resource_analytics_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD CONSTRAINT "funnel_resource_analytics_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funnel_resource_analytics_experience_id_idx" ON "funnel_resource_analytics" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "funnel_resource_analytics_funnel_id_idx" ON "funnel_resource_analytics" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "funnel_resource_analytics_resource_id_idx" ON "funnel_resource_analytics" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "funnel_resource_analytics_last_updated_idx" ON "funnel_resource_analytics" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "funnel_resource_analytics_total_revenue_idx" ON "funnel_resource_analytics" USING btree ("total_resource_revenue");--> statement-breakpoint
CREATE INDEX "funnel_analytics_last_updated_idx" ON "funnel_analytics" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "funnel_analytics_total_revenue_idx" ON "funnel_analytics" USING btree ("total_affiliate_revenue","total_product_revenue");--> statement-breakpoint
CREATE INDEX "funnels_whop_product_id_idx" ON "funnels" USING btree ("whop_product_id");--> statement-breakpoint
CREATE INDEX "funnels_experience_product_deployed_idx" ON "funnels" USING btree ("experience_id","whop_product_id","is_deployed");--> statement-breakpoint
CREATE INDEX "resources_whop_app_id_idx" ON "resources" USING btree ("whop_app_id");--> statement-breakpoint
CREATE INDEX "resources_whop_membership_id_idx" ON "resources" USING btree ("whop_membership_id");--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "views";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "starts";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "completions";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "conversions";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "revenue";--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD CONSTRAINT "unique_funnel" UNIQUE("funnel_id");