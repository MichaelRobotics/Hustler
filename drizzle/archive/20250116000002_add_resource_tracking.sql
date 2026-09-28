-- Add app and membership tracking to resources table
-- Add whop_app_id and whop_membership_id for tracking Whop entities

-- Add whop_app_id for app-based products
ALTER TABLE resources ADD COLUMN IF NOT EXISTS whop_app_id TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS whop_membership_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS resources_whop_app_id_idx ON resources(whop_app_id);
CREATE INDEX IF NOT EXISTS resources_whop_membership_id_idx ON resources(whop_membership_id);

-- Add unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS resources_experience_whop_app_unique 
ON resources(experience_id, whop_app_id) 
WHERE whop_app_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS resources_experience_whop_membership_unique 
ON resources(experience_id, whop_membership_id) 
WHERE whop_membership_id IS NOT NULL;
