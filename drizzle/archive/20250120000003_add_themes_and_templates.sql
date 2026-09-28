-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  theme_prompt TEXT,
  accent_color TEXT,
  ring_color TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
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

-- Add indexes for themes
CREATE INDEX IF NOT EXISTS themes_experience_id_idx ON themes(experience_id);
CREATE INDEX IF NOT EXISTS themes_season_idx ON themes(season);
CREATE INDEX IF NOT EXISTS themes_experience_season_idx ON themes(experience_id, season);

-- Add indexes for templates
CREATE INDEX IF NOT EXISTS templates_experience_id_idx ON templates(experience_id);
CREATE INDEX IF NOT EXISTS templates_user_id_idx ON templates(user_id);
CREATE INDEX IF NOT EXISTS templates_theme_id_idx ON templates(theme_id);
CREATE INDEX IF NOT EXISTS templates_is_live_idx ON templates(is_live);
CREATE INDEX IF NOT EXISTS templates_is_last_edited_idx ON templates(is_last_edited);
CREATE INDEX IF NOT EXISTS templates_experience_live_idx ON templates(experience_id, is_live);
CREATE INDEX IF NOT EXISTS templates_experience_last_edited_idx ON templates(experience_id, is_last_edited);

-- Add unique constraints
ALTER TABLE themes ADD CONSTRAINT IF NOT EXISTS themes_experience_season_unique 
UNIQUE(experience_id, season);

ALTER TABLE templates ADD CONSTRAINT IF NOT EXISTS templates_experience_name_unique 
UNIQUE(experience_id, name);

-- Ensure only one live template per experience
CREATE UNIQUE INDEX IF NOT EXISTS templates_experience_live_unique 
ON templates(experience_id) 
WHERE is_live = TRUE;

-- Ensure only one last edited template per experience
CREATE UNIQUE INDEX IF NOT EXISTS templates_experience_last_edited_unique 
ON templates(experience_id) 
WHERE is_last_edited = TRUE;




