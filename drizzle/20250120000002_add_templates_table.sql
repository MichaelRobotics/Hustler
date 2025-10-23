-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  theme_snapshot JSONB NOT NULL,
  current_season TEXT NOT NULL,
  is_live BOOLEAN DEFAULT FALSE,
  is_last_edited BOOLEAN DEFAULT FALSE,
  template_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX templates_experience_id_idx ON templates(experience_id);
CREATE INDEX templates_user_id_idx ON templates(user_id);
CREATE INDEX templates_theme_id_idx ON templates(theme_id);
CREATE INDEX templates_is_live_idx ON templates(is_live);
CREATE INDEX templates_is_last_edited_idx ON templates(is_last_edited);
CREATE INDEX templates_experience_live_idx ON templates(experience_id, is_live);
CREATE INDEX templates_experience_last_edited_idx ON templates(experience_id, is_last_edited);

-- Add unique constraint for template name per experience
ALTER TABLE templates ADD CONSTRAINT templates_experience_name_unique 
UNIQUE(experience_id, name);

-- Ensure only one live template per experience
CREATE UNIQUE INDEX templates_experience_live_unique 
ON templates(experience_id) 
WHERE is_live = TRUE;

-- Ensure only one last edited template per experience
CREATE UNIQUE INDEX templates_experience_last_edited_unique 
ON templates(experience_id) 
WHERE is_last_edited = TRUE;



