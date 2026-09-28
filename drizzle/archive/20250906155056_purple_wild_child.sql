ALTER TABLE "funnels" ADD COLUMN "visualization_state" jsonb DEFAULT '{}';--> statement-breakpoint
CREATE INDEX "funnels_visualization_state_idx" ON "funnels" USING gin ("visualization_state");