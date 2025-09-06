-- Performance optimization indexes
-- These indexes will significantly improve query performance for common operations

-- Funnels table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnels_experience_user_updated 
ON funnels(experience_id, user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnels_experience_deployed 
ON funnels(experience_id, is_deployed) WHERE is_deployed = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnels_name_search 
ON funnels USING gin(to_tsvector('english', name));

-- Resources table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resources_experience_user_updated 
ON resources(experience_id, user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resources_type_category 
ON resources(type, category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resources_name_search 
ON resources USING gin(to_tsvector('english', name));

-- Funnel resources junction table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnel_resources_funnel_id 
ON funnel_resources(funnel_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnel_resources_resource_id 
ON funnel_resources(resource_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnel_resources_composite 
ON funnel_resources(funnel_id, resource_id);

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_experience_updated 
ON users(experience_id, updated_at DESC);

-- Analytics table indexes (if they exist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_funnel_analytics_funnel_date 
ON funnel_analytics(funnel_id, created_at DESC);

-- Conversations table indexes (if they exist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_funnel_status 
ON conversations(funnel_id, status, created_at DESC);
