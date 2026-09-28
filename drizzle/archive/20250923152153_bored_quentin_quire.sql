-- Add type field to funnel_resource_analytics table
-- This field indicates whether the revenue is from AFFILIATE or PRODUCT type

-- Add the type column
ALTER TABLE funnel_resource_analytics 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'PRODUCT' 
CHECK (type IN ('AFFILIATE', 'PRODUCT'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_funnel_resource_analytics_type 
ON funnel_resource_analytics(type);

-- Update existing records to have PRODUCT type (they were product revenue)
UPDATE funnel_resource_analytics 
SET type = 'PRODUCT' 
WHERE type = 'PRODUCT';