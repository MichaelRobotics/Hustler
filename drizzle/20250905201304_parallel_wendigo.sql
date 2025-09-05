CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whop_experience_id" text NOT NULL,
	"whop_company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "experiences_whop_experience_id_unique" UNIQUE("whop_experience_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "experience_id" uuid;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD COLUMN "experience_id" uuid;--> statement-breakpoint
ALTER TABLE "funnels" ADD COLUMN "experience_id" uuid;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "experience_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "experience_id" uuid;--> statement-breakpoint
CREATE INDEX "experiences_whop_experience_id_idx" ON "experiences" USING btree ("whop_experience_id");--> statement-breakpoint
CREATE INDEX "experiences_whop_company_id_idx" ON "experiences" USING btree ("whop_company_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_analytics" ADD CONSTRAINT "funnel_analytics_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnels" ADD CONSTRAINT "funnels_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_experience_id_idx" ON "conversations" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "funnel_analytics_experience_id_idx" ON "funnel_analytics" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "funnels_experience_id_idx" ON "funnels" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "resources_experience_id_idx" ON "resources" USING btree ("experience_id");--> statement-breakpoint
CREATE INDEX "users_experience_id_idx" ON "users" USING btree ("experience_id");