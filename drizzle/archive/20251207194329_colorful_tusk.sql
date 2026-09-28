CREATE TABLE "origin_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"company_logo_url" text,
	"company_banner_image_url" text,
	"theme_prompt" text,
	"default_theme_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "origin_templates_experience_unique" UNIQUE("experience_id")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"theme_id" uuid,
	"theme_snapshot" jsonb NOT NULL,
	"current_season" text NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"is_last_edited" boolean DEFAULT false NOT NULL,
	"template_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "templates_experience_name_unique" UNIQUE("experience_id","name")
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"name" text NOT NULL,
	"season" text NOT NULL,
	"theme_prompt" text,
	"accent_color" text,
	"ring_color" text,
	"card" text,
	"text" text,
	"welcome_color" text,
	"placeholder_image" text,
	"main_header" text,
	"sub_header" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Note: Type conversion was already done by the manual migration script
-- The type column should already be using the new enum with LINK/FILE values
-- This statement ensures the column type matches the schema
ALTER TABLE "resources" ALTER COLUMN "type" SET DATA TYPE "public"."resource_type" USING "type"::"public"."resource_type";--> statement-breakpoint
DROP INDEX "funnels_whop_product_id_idx";--> statement-breakpoint
DROP INDEX "funnels_experience_product_deployed_idx";--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "link" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "whop_product_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "flow" jsonb;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "my_affiliate_link" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "affiliate_send" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "experiences" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD COLUMN "type" text DEFAULT 'PRODUCT' NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "product_apps" jsonb;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "storage_url" text;--> statement-breakpoint
ALTER TABLE "origin_templates" ADD CONSTRAINT "origin_templates_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "origin_templates_experience_id_idx" ON "origin_templates" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "templates_experience_id_idx" ON "templates" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "templates_user_id_idx" ON "templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "templates_theme_id_idx" ON "templates" USING btree ("theme_id");--> statement-breakpoint
CREATE INDEX "templates_is_live_idx" ON "templates" USING btree ("is_live");--> statement-breakpoint
CREATE INDEX "templates_is_last_edited_idx" ON "templates" USING btree ("is_last_edited");--> statement-breakpoint
CREATE INDEX "templates_experience_live_idx" ON "templates" USING btree ("experience_id","is_live");--> statement-breakpoint
CREATE INDEX "templates_experience_last_edited_idx" ON "templates" USING btree ("experience_id","is_last_edited");--> statement-breakpoint
CREATE INDEX "themes_experience_id_idx" ON "themes" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "themes_season_idx" ON "themes" USING btree ("season");--> statement-breakpoint
CREATE INDEX "themes_experience_season_idx" ON "themes" USING btree ("experience_id","season");--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" DROP COLUMN "scenario";--> statement-breakpoint
ALTER TABLE "funnels" DROP COLUMN "whop_product_id";