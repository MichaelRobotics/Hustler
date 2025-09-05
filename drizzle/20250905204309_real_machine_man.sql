ALTER TABLE "companies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "companies" CASCADE;--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP CONSTRAINT "funnel_analytics_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "funnels" DROP CONSTRAINT "funnels_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "resources" DROP CONSTRAINT "resources_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_company_id_companies_id_fk";
--> statement-breakpoint
DROP INDEX "conversations_company_id_idx";--> statement-breakpoint
DROP INDEX "funnel_analytics_company_id_idx";--> statement-breakpoint
DROP INDEX "funnels_company_id_idx";--> statement-breakpoint
DROP INDEX "resources_company_id_idx";--> statement-breakpoint
DROP INDEX "users_company_id_idx";--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "experience_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ALTER COLUMN "experience_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "funnels" ALTER COLUMN "experience_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "experience_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "experience_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "company_id";--> statement-breakpoint
ALTER TABLE "funnel_analytics" DROP COLUMN "company_id";--> statement-breakpoint
ALTER TABLE "funnels" DROP COLUMN "company_id";--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN "company_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "company_id";