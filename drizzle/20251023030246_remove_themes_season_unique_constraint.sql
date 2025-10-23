-- Remove unique constraint that allows only one theme per season per experience
-- This allows multiple custom themes per season

-- Drop the unique constraint
ALTER TABLE themes DROP CONSTRAINT IF EXISTS themes_experience_season_unique;

-- Add a comment explaining the change
COMMENT ON TABLE themes IS 'Themes table - multiple themes allowed per season per experience';

