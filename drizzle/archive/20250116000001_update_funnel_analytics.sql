-- Update funnel_analytics table for enhanced analytics
-- Remove views column and split revenue into affiliate and product revenue
-- Add free_clicks tracking and resource-specific analytics

-- Remove views column
ALTER TABLE funnel_analytics DROP COLUMN IF EXISTS views;

-- Split revenue into affiliate and product revenue
ALTER TABLE funnel_analytics ADD COLUMN IF NOT EXISTS affiliate_revenue DECIMAL(10,2) DEFAULT '0' NOT NULL;
ALTER TABLE funnel_analytics ADD COLUMN IF NOT EXISTS product_revenue DECIMAL(10,2) DEFAULT '0' NOT NULL;

-- Add free_clicks tracking
ALTER TABLE funnel_analytics ADD COLUMN IF NOT EXISTS free_clicks INTEGER DEFAULT 0 NOT NULL;

-- Add resource-specific analytics
ALTER TABLE funnel_analytics ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES resources(id) ON DELETE CASCADE;
ALTER TABLE funnel_analytics ADD COLUMN IF NOT EXISTS resource_clicks INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE funnel_analytics ADD COLUMN IF NOT EXISTS resource_conversions INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE funnel_analytics ADD COLUMN IF NOT EXISTS resource_revenue DECIMAL(10,2) DEFAULT '0' NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS funnel_analytics_resource_id_idx ON funnel_analytics(resource_id);
CREATE INDEX IF NOT EXISTS funnel_analytics_affiliate_revenue_idx ON funnel_analytics(affiliate_revenue);
CREATE INDEX IF NOT EXISTS funnel_analytics_product_revenue_idx ON funnel_analytics(product_revenue);

-- Migrate existing revenue data to product_revenue (assuming existing revenue was from products)
UPDATE funnel_analytics SET product_revenue = revenue WHERE revenue > 0;

-- Remove old revenue column after migration
ALTER TABLE funnel_analytics DROP COLUMN IF EXISTS revenue;
