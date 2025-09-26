-- Add link field to experiences table
-- This field will store the app link for each experience

-- Add the link column
ALTER TABLE experiences 
ADD COLUMN IF NOT EXISTS link text;

-- Add comment for documentation
COMMENT ON COLUMN experiences.link IS 'App link for this experience';
