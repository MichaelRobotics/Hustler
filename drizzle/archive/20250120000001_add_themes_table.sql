-- Create themes table
CREATE TABLE themes (
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

-- Add indexes for performance
CREATE INDEX themes_experience_id_idx ON themes(experience_id);
CREATE INDEX themes_season_idx ON themes(season);
CREATE INDEX themes_experience_season_idx ON themes(experience_id, season);

-- Add unique constraint for one theme per season per experience
ALTER TABLE themes ADD CONSTRAINT themes_experience_season_unique 
UNIQUE(experience_id, season);




