-- DM channels cache: Whop DM channel ids keyed by company + admin + customer (scoped by companyId)
CREATE TABLE IF NOT EXISTS "dm_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"admin_whop_user_id" text NOT NULL,
	"customer_whop_user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "dm_channels_company_id_idx" ON "dm_channels" USING btree ("company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "dm_channels_company_admin_customer_unique" ON "dm_channels" USING btree ("company_id", "admin_whop_user_id", "customer_whop_user_id");
