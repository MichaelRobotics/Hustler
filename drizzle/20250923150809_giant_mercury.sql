ALTER TABLE "funnel_resource_analytics" ADD COLUMN "scenario" text DEFAULT 'MY_PRODUCT' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "affiliate_link";