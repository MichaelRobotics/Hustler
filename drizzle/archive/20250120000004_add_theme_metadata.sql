-- Add new columns to themes table for storing custom theme metadata
ALTER TABLE themes 
ADD COLUMN IF NOT EXISTS placeholder_image TEXT,
ADD COLUMN IF NOT EXISTS main_header TEXT,
ADD COLUMN IF NOT EXISTS sub_header TEXT;

-- Add comments for documentation
COMMENT ON COLUMN themes.placeholder_image IS 'Refined product placeholder image URL for custom themes';
COMMENT ON COLUMN themes.main_header IS 'AI-generated main header text for the theme';
COMMENT ON COLUMN themes.sub_header IS 'AI-generated subheader text for the theme';

