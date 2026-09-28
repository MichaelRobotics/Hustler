CREATE TYPE "public"."conversation_status" AS ENUM('active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."funnel_trigger_type" AS ENUM('on_app_entry', 'any_membership_buy', 'membership_buy', 'no_active_conversation', 'qualification_merchant_complete', 'upsell_merchant_complete', 'delete_merchant_conversation', 'cancel_membership', 'any_cancel_membership');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('idle', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('user', 'bot');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('percentage', 'flat_amount');--> statement-breakpoint
CREATE TYPE "public"."resource_category" AS ENUM('PAID', 'FREE_VALUE');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('LINK', 'FILE', 'WHOP');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'removed');--> statement-breakpoint
CREATE TYPE "public"."seasonal_discount_duration_type" AS ENUM('one-time', 'forever', 'duration_months');--> statement-breakpoint
CREATE TYPE "public"."subscription_type" AS ENUM('Basic', 'Pro', 'Vip');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"whop_user_id" text NOT NULL,
	"membership_id" text,
	"whop_product_id" text,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"current_block_id" text,
	"current_block_entered_at" timestamp,
	"last_notification_sequence_sent" integer,
	"offer_cta_clicked_at" timestamp,
	"offer_cta_block_id" text,
	"offer_purchased_at" timestamp,
	"user_last_read_at" timestamp,
	"admin_last_read_at" timestamp,
	"unread_count_admin" integer DEFAULT 0 NOT NULL,
	"unread_count_user" integer DEFAULT 0 NOT NULL,
	"controlled_by" text DEFAULT 'bot' NOT NULL,
	"user_typing" boolean DEFAULT false NOT NULL,
	"admin_typing" boolean DEFAULT false NOT NULL,
	"user_typing_at" timestamp,
	"admin_typing_at" timestamp,
	"flow" jsonb,
	"user_path" jsonb,
	"phase2_start_time" timestamp,
	"my_affiliate_link" text,
	"affiliate_send" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"experience_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" text NOT NULL,
	"membership_plan_id" text NOT NULL,
	"membership_product_id" text,
	"download_link" text,
	"product_name" text NOT NULL,
	"description" text,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"admin_whop_user_id" text NOT NULL,
	"customer_whop_user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dm_channels_company_admin_customer_unique" UNIQUE("company_id","admin_whop_user_id","customer_whop_user_id")
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whop_experience_id" text NOT NULL,
	"whop_company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"link" text,
	"seasonal_discount_id" text,
	"seasonal_discount_promo" text,
	"seasonal_discount_start" timestamp,
	"seasonal_discount_end" timestamp,
	"seasonal_discount_text" text,
	"seasonal_discount_quantity_per_product" integer,
	"seasonal_discount_duration_type" "seasonal_discount_duration_type",
	"seasonal_discount_duration_months" integer,
	"global_discount" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_whop_experience_id_unique" UNIQUE("whop_experience_id")
);
--> statement-breakpoint
CREATE TABLE "funnel_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"total_starts" integer DEFAULT 0 NOT NULL,
	"total_intent" integer DEFAULT 0 NOT NULL,
	"total_conversions" integer DEFAULT 0 NOT NULL,
	"total_affiliate_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_product_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_interest" integer DEFAULT 0 NOT NULL,
	"today_starts" integer DEFAULT 0 NOT NULL,
	"today_intent" integer DEFAULT 0 NOT NULL,
	"today_conversions" integer DEFAULT 0 NOT NULL,
	"today_affiliate_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"today_product_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"today_interest" integer DEFAULT 0 NOT NULL,
	"yesterday_starts" integer DEFAULT 0 NOT NULL,
	"yesterday_intent" integer DEFAULT 0 NOT NULL,
	"yesterday_conversions" integer DEFAULT 0 NOT NULL,
	"yesterday_interest" integer DEFAULT 0 NOT NULL,
	"starts_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"intent_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"conversions_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"interest_growth_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_funnel" UNIQUE("funnel_id")
);
--> statement-breakpoint
CREATE TABLE "funnel_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"block_id" text NOT NULL,
	"option_text" text NOT NULL,
	"next_block_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"stage_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"inactivity_minutes" integer NOT NULL,
	"message" text NOT NULL,
	"is_reset" boolean DEFAULT false NOT NULL,
	"reset_action" text,
	"delay_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_notifications_funnel_stage_sequence_unique" UNIQUE("funnel_id","stage_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "funnel_product_faq" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"faq_content" text,
	"objection_handling" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_product_faq_funnel_resource_unique" UNIQUE("funnel_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "funnel_resource_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"total_resource_clicks" integer DEFAULT 0 NOT NULL,
	"total_resource_conversions" integer DEFAULT 0 NOT NULL,
	"total_resource_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_interest" integer DEFAULT 0 NOT NULL,
	"today_resource_clicks" integer DEFAULT 0 NOT NULL,
	"today_resource_conversions" integer DEFAULT 0 NOT NULL,
	"today_resource_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"today_interest" integer DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'PRODUCT' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"funnel_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_funnel_resource" UNIQUE("funnel_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "funnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"flow" jsonb,
	"visualization_state" jsonb DEFAULT '{}',
	"membership_trigger_type" "funnel_trigger_type",
	"app_trigger_type" "funnel_trigger_type",
	"is_deployed" boolean DEFAULT false NOT NULL,
	"was_ever_deployed" boolean DEFAULT false NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"generation_status" "generation_status" DEFAULT 'idle' NOT NULL,
	"sends" integer DEFAULT 0 NOT NULL,
	"membership_trigger_config" jsonb DEFAULT '{}',
	"app_trigger_config" jsonb DEFAULT '{}',
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"membership_delay_minutes" integer DEFAULT 0 NOT NULL,
	"merchant_type" text DEFAULT 'qualification' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"type" "message_type" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "one_time_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"promo_code" text DEFAULT '' NOT NULL,
	"target_product_id" text DEFAULT '' NOT NULL,
	"discount_type" text DEFAULT 'percentage' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "one_time_discounts_experience_product_unique" UNIQUE("experience_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whop_company_id" text NOT NULL,
	"user_id" uuid,
	"plan_id" text,
	"prod_id" text,
	"prod_name" text NOT NULL,
	"payment_id" text NOT NULL,
	"access_level" text NOT NULL,
	"avatar" text,
	"user_name" text NOT NULL,
	"email" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"messages" integer,
	"credits" integer,
	"subscription" "subscription_type",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
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
CREATE TABLE "pending_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"whop_user_id" text NOT NULL,
	"trigger_context" text NOT NULL,
	"membership_id" text,
	"product_id" text,
	"fire_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_triggers_experience_user_unique" UNIQUE("experience_id","whop_user_id","funnel_id","status")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"whop_product_id" text,
	"checkout_configuration_id" text,
	"plan_id" text NOT NULL,
	"whop_company_id" text NOT NULL,
	"purchase_url" text,
	"initial_price" numeric(10, 2),
	"renewal_price" numeric(10, 2),
	"currency" text,
	"plan_type" text,
	"promo_ids" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whop_company_id" text NOT NULL,
	"whop_promo_id" text,
	"code" text NOT NULL,
	"amount_off" numeric(10, 2) NOT NULL,
	"base_currency" text NOT NULL,
	"company_id" text NOT NULL,
	"new_users_only" boolean NOT NULL,
	"promo_duration_months" integer NOT NULL,
	"promo_type" "promo_type" NOT NULL,
	"churned_users_only" boolean,
	"existing_memberships_only" boolean,
	"expires_at" timestamp,
	"one_per_customer" boolean,
	"plan_ids" jsonb,
	"product_id" text,
	"stock" integer,
	"unlimited_stock" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "resource_type" NOT NULL,
	"category" "resource_category" NOT NULL,
	"link" text,
	"code" text,
	"description" text,
	"whop_product_id" text,
	"whop_membership_id" text,
	"price" numeric(10, 2),
	"image" text,
	"storage_url" text,
	"product_images" jsonb,
	"display_order" integer,
	"plan_id" text,
	"purchase_url" text,
	"checkout_configuration_id" text,
	"sold" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experience_id" uuid NOT NULL,
	"resource_id" uuid,
	"whop_product_id" text,
	"plan_id" text,
	"whop_review_id" text NOT NULL,
	"title" text,
	"description" text,
	"stars" integer NOT NULL,
	"status" "review_status" NOT NULL,
	"paid_for_product" boolean,
	"user_id" text NOT NULL,
	"user_name" text,
	"user_username" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"joined_at" timestamp,
	CONSTRAINT "reviews_whop_review_id_unique" UNIQUE("whop_review_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2),
	"credits" numeric(10, 2),
	"messages" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whop_user_id" text NOT NULL,
	"experience_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"credits" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"subscription" "subscription_type",
	"membership" text,
	"access_level" text DEFAULT 'customer' NOT NULL,
	"products_synced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_whop_user_experience_unique" UNIQUE("whop_user_id","experience_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers_resources" ADD CONSTRAINT "customers_resources_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers_resources" ADD CONSTRAINT "customers_resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD CONSTRAINT "funnel_analytics_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD CONSTRAINT "funnel_analytics_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_interactions" ADD CONSTRAINT "funnel_interactions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_notifications" ADD CONSTRAINT "funnel_notifications_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_product_faq" ADD CONSTRAINT "funnel_product_faq_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_product_faq" ADD CONSTRAINT "funnel_product_faq_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD CONSTRAINT "funnel_resource_analytics_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD CONSTRAINT "funnel_resource_analytics_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_resource_analytics" ADD CONSTRAINT "funnel_resource_analytics_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_resources" ADD CONSTRAINT "funnel_resources_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_resources" ADD CONSTRAINT "funnel_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "one_time_discounts" ADD CONSTRAINT "one_time_discounts_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "origin_templates" ADD CONSTRAINT "origin_templates_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_triggers" ADD CONSTRAINT "pending_triggers_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_triggers" ADD CONSTRAINT "pending_triggers_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_experience_id_idx" ON "conversations" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "conversations_funnel_id_idx" ON "conversations" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "conversations_whop_user_id_idx" ON "conversations" USING btree ("whop_user_id");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customers_resources_experience_id_idx" ON "customers_resources" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "customers_resources_user_id_idx" ON "customers_resources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customers_resources_company_id_idx" ON "customers_resources" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "customers_resources_membership_plan_id_idx" ON "customers_resources" USING btree ("membership_plan_id");--> statement-breakpoint
CREATE INDEX "customers_resources_membership_product_id_idx" ON "customers_resources" USING btree ("membership_product_id");--> statement-breakpoint
CREATE INDEX "dm_channels_company_id_idx" ON "dm_channels" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "experiences_whop_experience_id_idx" ON "experiences" USING btree ("whop_experience_id");--> statement-breakpoint
CREATE INDEX "experiences_whop_company_id_idx" ON "experiences" USING btree ("whop_company_id");--> statement-breakpoint
CREATE INDEX "experiences_updated_at_idx" ON "experiences" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "funnel_analytics_experience_id_idx" ON "funnel_analytics" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "funnel_analytics_funnel_id_idx" ON "funnel_analytics" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "funnel_analytics_last_updated_idx" ON "funnel_analytics" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "funnel_analytics_total_revenue_idx" ON "funnel_analytics" USING btree ("total_affiliate_revenue","total_product_revenue");--> statement-breakpoint
CREATE INDEX "funnel_interactions_conversation_id_idx" ON "funnel_interactions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "funnel_interactions_block_id_idx" ON "funnel_interactions" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "funnel_notifications_funnel_id_idx" ON "funnel_notifications" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "funnel_notifications_stage_id_idx" ON "funnel_notifications" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "funnel_product_faq_funnel_id_idx" ON "funnel_product_faq" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "funnel_product_faq_resource_id_idx" ON "funnel_product_faq" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "funnel_resources_funnel_id_idx" ON "funnel_resources" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX "funnel_resources_resource_id_idx" ON "funnel_resources" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "funnels_experience_id_idx" ON "funnels" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "funnels_user_id_idx" ON "funnels" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "funnels_is_deployed_idx" ON "funnels" USING btree ("is_deployed");--> statement-breakpoint
CREATE INDEX "funnels_generation_status_idx" ON "funnels" USING btree ("generation_status");--> statement-breakpoint
CREATE INDEX "funnels_visualization_state_idx" ON "funnels" USING gin ("visualization_state");--> statement-breakpoint
CREATE INDEX "funnels_experience_user_updated_idx" ON "funnels" USING btree ("experience_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "funnels_experience_deployed_idx" ON "funnels" USING btree ("experience_id","is_deployed");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_type_idx" ON "messages" USING btree ("type");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "one_time_discounts_experience_id_idx" ON "one_time_discounts" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_whop_company_id_idx" ON "orders" USING btree ("whop_company_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_company_created_idx" ON "orders" USING btree ("whop_company_id","created_at");--> statement-breakpoint
CREATE INDEX "origin_templates_experience_id_idx" ON "origin_templates" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "pending_triggers_experience_id_idx" ON "pending_triggers" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "pending_triggers_status_fire_at_idx" ON "pending_triggers" USING btree ("status","fire_at");--> statement-breakpoint
CREATE INDEX "plans_resource_id_idx" ON "plans" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "plans_whop_product_id_idx" ON "plans" USING btree ("whop_product_id");--> statement-breakpoint
CREATE INDEX "plans_checkout_configuration_id_idx" ON "plans" USING btree ("checkout_configuration_id");--> statement-breakpoint
CREATE INDEX "plans_plan_id_idx" ON "plans" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plans_whop_company_id_idx" ON "plans" USING btree ("whop_company_id");--> statement-breakpoint
CREATE INDEX "plans_promo_ids_idx" ON "plans" USING gin ("promo_ids");--> statement-breakpoint
CREATE INDEX "promos_whop_company_id_idx" ON "promos" USING btree ("whop_company_id");--> statement-breakpoint
CREATE INDEX "promos_code_idx" ON "promos" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promos_whop_promo_id_idx" ON "promos" USING btree ("whop_promo_id");--> statement-breakpoint
CREATE INDEX "promos_company_id_idx" ON "promos" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "promos_product_id_idx" ON "promos" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "resources_experience_id_idx" ON "resources" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "resources_user_id_idx" ON "resources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resources_type_idx" ON "resources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "resources_whop_product_id_idx" ON "resources" USING btree ("whop_product_id");--> statement-breakpoint
CREATE INDEX "resources_whop_membership_id_idx" ON "resources" USING btree ("whop_membership_id");--> statement-breakpoint
CREATE INDEX "resources_checkout_configuration_id_idx" ON "resources" USING btree ("checkout_configuration_id");--> statement-breakpoint
CREATE INDEX "resources_experience_user_updated_idx" ON "resources" USING btree ("experience_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "resources_type_category_idx" ON "resources" USING btree ("type","category");--> statement-breakpoint
CREATE INDEX "resources_experience_display_order_idx" ON "resources" USING btree ("experience_id","display_order");--> statement-breakpoint
CREATE INDEX "resources_sold_idx" ON "resources" USING btree ("sold");--> statement-breakpoint
CREATE INDEX "reviews_whop_review_id_idx" ON "reviews" USING btree ("whop_review_id");--> statement-breakpoint
CREATE INDEX "reviews_whop_product_id_idx" ON "reviews" USING btree ("whop_product_id");--> statement-breakpoint
CREATE INDEX "reviews_plan_id_idx" ON "reviews" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "reviews_experience_id_idx" ON "reviews" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "reviews_resource_id_idx" ON "reviews" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "subscriptions_type_idx" ON "subscriptions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "subscriptions_type_amount_idx" ON "subscriptions" USING btree ("type","amount");--> statement-breakpoint
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
CREATE INDEX "users_whop_user_id_idx" ON "users" USING btree ("whop_user_id");--> statement-breakpoint
CREATE INDEX "users_experience_id_idx" ON "users" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "users_experience_updated_idx" ON "users" USING btree ("experience_id","updated_at");--> statement-breakpoint
CREATE INDEX "users_access_level_idx" ON "users" USING btree ("access_level");--> statement-breakpoint
CREATE INDEX "users_experience_access_level_idx" ON "users" USING btree ("experience_id","access_level");--> statement-breakpoint
CREATE INDEX "users_membership_idx" ON "users" USING btree ("membership");