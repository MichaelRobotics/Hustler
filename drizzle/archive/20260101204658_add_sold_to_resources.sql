-- Add sold field to resources table
ALTER TABLE resources ADD COLUMN IF NOT EXISTS sold INTEGER;

-- Create index on sold field
CREATE INDEX IF NOT EXISTS resources_sold_idx ON resources(sold);


