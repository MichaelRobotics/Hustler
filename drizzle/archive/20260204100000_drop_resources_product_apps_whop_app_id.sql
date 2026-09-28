-- Drop index on whop_app_id (column will be dropped)
DROP INDEX IF EXISTS "resources_whop_app_id_idx";--> statement-breakpoint

-- Drop product_apps and whop_app_id columns from resources
ALTER TABLE "resources" DROP COLUMN IF EXISTS "product_apps";--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN IF EXISTS "whop_app_id";
