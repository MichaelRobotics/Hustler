-- Add check constraints for analytics data validation
-- This migration adds data validation constraints to ensure data integrity

-- Add check constraints for funnel_analytics table
ALTER TABLE funnel_analytics ADD CONSTRAINT check_positive_metrics 
  CHECK (
    total_starts >= 0 AND 
    total_intent >= 0 AND 
    total_conversions >= 0 AND
    total_interest >= 0 AND
    today_starts >= 0 AND 
    today_intent >= 0 AND 
    today_conversions >= 0 AND
    today_interest >= 0
  );

-- Add check constraints for revenue fields
ALTER TABLE funnel_analytics ADD CONSTRAINT check_positive_revenue 
  CHECK (
    total_affiliate_revenue >= 0 AND 
    total_product_revenue >= 0 AND
    today_affiliate_revenue >= 0 AND 
    today_product_revenue >= 0
  );

-- Add check constraints for growth percentages (allow negative for losses)
ALTER TABLE funnel_analytics ADD CONSTRAINT check_growth_percentages 
  CHECK (
    starts_growth_percent >= -999.99 AND starts_growth_percent <= 999.99 AND
    intent_growth_percent >= -999.99 AND intent_growth_percent <= 999.99 AND
    conversions_growth_percent >= -999.99 AND conversions_growth_percent <= 999.99 AND
    interest_growth_percent >= -999.99 AND interest_growth_percent <= 999.99
  );

-- Add check constraints for funnel_resource_analytics table
ALTER TABLE funnel_resource_analytics ADD CONSTRAINT check_positive_resource_metrics 
  CHECK (
    total_resource_clicks >= 0 AND 
    total_resource_conversions >= 0 AND
    total_interest >= 0 AND
    today_resource_clicks >= 0 AND 
    today_resource_conversions >= 0 AND
    today_interest >= 0
  );

-- Add check constraints for resource revenue
ALTER TABLE funnel_resource_analytics ADD CONSTRAINT check_positive_resource_revenue 
  CHECK (
    total_resource_revenue >= 0 AND 
    today_resource_revenue >= 0
  );

-- Add indexes for better performance on analytics queries
CREATE INDEX IF NOT EXISTS funnel_analytics_experience_funnel_idx 
  ON funnel_analytics(experience_id, funnel_id);

CREATE INDEX IF NOT EXISTS funnel_resource_analytics_experience_funnel_resource_idx 
  ON funnel_resource_analytics(experience_id, funnel_id, resource_id);

-- Add composite index for growth percentage queries
CREATE INDEX IF NOT EXISTS funnel_analytics_growth_percentages_idx 
  ON funnel_analytics(starts_growth_percent, intent_growth_percent, conversions_growth_percent, interest_growth_percent);

