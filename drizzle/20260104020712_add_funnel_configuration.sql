-- Add configuration columns to funnels table
ALTER TABLE "funnels" ADD COLUMN "trigger_timeout_minutes" jsonb DEFAULT '{}';
ALTER TABLE "funnels" ADD COLUMN "handout_keyword" text DEFAULT 'handout';
ALTER TABLE "funnels" ADD COLUMN "handout_admin_notification" text;
ALTER TABLE "funnels" ADD COLUMN "handout_user_message" text;

-- Create funnel_notifications table for reminder notifications per stage
CREATE TABLE "funnel_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"stage_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"inactivity_minutes" integer NOT NULL,
	"message" text NOT NULL,
	"is_reset" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create funnel_product_faq table for FAQ and objection handling per product
CREATE TABLE "funnel_product_faq" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"faq_content" text,
	"objection_handling" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "funnel_notifications" ADD CONSTRAINT "funnel_notifications_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "funnel_product_faq" ADD CONSTRAINT "funnel_product_faq_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "funnel_product_faq" ADD CONSTRAINT "funnel_product_faq_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;

-- Add indexes
CREATE INDEX "funnel_notifications_funnel_id_idx" ON "funnel_notifications" USING btree ("funnel_id");
CREATE INDEX "funnel_notifications_stage_id_idx" ON "funnel_notifications" USING btree ("stage_id");
CREATE UNIQUE INDEX "funnel_notifications_funnel_stage_sequence_unique" ON "funnel_notifications" USING btree ("funnel_id", "stage_id", "sequence");

CREATE INDEX "funnel_product_faq_funnel_id_idx" ON "funnel_product_faq" USING btree ("funnel_id");
CREATE INDEX "funnel_product_faq_resource_id_idx" ON "funnel_product_faq" USING btree ("resource_id");
CREATE UNIQUE INDEX "funnel_product_faq_funnel_resource_unique" ON "funnel_product_faq" USING btree ("funnel_id", "resource_id");




