-- Pending triggers table: stores delayed trigger executions
-- When a trigger fires and the funnel has delayMinutes > 0, the trigger is stored here
-- A cron job processes rows where fire_at <= now() and status = 'pending'

CREATE TABLE IF NOT EXISTS pending_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  whop_user_id TEXT NOT NULL,
  trigger_context TEXT NOT NULL,
  membership_id TEXT,
  product_id TEXT,
  fire_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_triggers_experience_id_idx ON pending_triggers(experience_id);
CREATE INDEX IF NOT EXISTS pending_triggers_status_fire_at_idx ON pending_triggers(status, fire_at);
CREATE UNIQUE INDEX IF NOT EXISTS pending_triggers_experience_user_unique ON pending_triggers(experience_id, whop_user_id, funnel_id, status);
