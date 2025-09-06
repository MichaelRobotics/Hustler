-- Add visualization state to funnels table
ALTER TABLE funnels ADD COLUMN visualization_state jsonb DEFAULT '{}'::jsonb;

-- Add GIN index for visualization state queries
CREATE INDEX funnels_visualization_state_idx ON funnels USING gin (visualization_state);

-- Add comment for documentation
COMMENT ON COLUMN funnels.visualization_state IS 'Stores user visualization preferences: positions, viewport, layout settings, and interaction state';