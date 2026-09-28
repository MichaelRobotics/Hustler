-- Row Level Security (RLS) Policies for Multi-Tenant Security
-- This file contains all RLS policies to ensure proper data isolation

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_analytics ENABLE ROW LEVEL SECURITY;

-- ===== COMPANIES TABLE POLICIES =====
-- Companies can only see their own data
CREATE POLICY "Companies can view own data" ON companies
    FOR SELECT USING (whop_company_id = current_setting('app.current_company_id', true));

CREATE POLICY "Companies can insert own data" ON companies
    FOR INSERT WITH CHECK (whop_company_id = current_setting('app.current_company_id', true));

CREATE POLICY "Companies can update own data" ON companies
    FOR UPDATE USING (whop_company_id = current_setting('app.current_company_id', true));

-- ===== USERS TABLE POLICIES =====
-- Users can only see users from their company
CREATE POLICY "Users can view company users" ON users
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can insert company users" ON users
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can update company users" ON users
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

-- ===== FUNNELS TABLE POLICIES =====
-- Users can only see funnels from their company
CREATE POLICY "Users can view company funnels" ON funnels
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can insert company funnels" ON funnels
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can update company funnels" ON funnels
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can delete company funnels" ON funnels
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

-- ===== RESOURCES TABLE POLICIES =====
-- Users can only see resources from their company
CREATE POLICY "Users can view company resources" ON resources
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can insert company resources" ON resources
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can update company resources" ON resources
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can delete company resources" ON resources
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

-- ===== FUNNEL_RESOURCES TABLE POLICIES =====
-- Users can only see funnel-resource relationships from their company
CREATE POLICY "Users can view company funnel resources" ON funnel_resources
    FOR SELECT USING (
        funnel_id IN (
            SELECT f.id FROM funnels f
            JOIN companies c ON f.company_id = c.id
            WHERE c.whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can insert company funnel resources" ON funnel_resources
    FOR INSERT WITH CHECK (
        funnel_id IN (
            SELECT f.id FROM funnels f
            JOIN companies c ON f.company_id = c.id
            WHERE c.whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can delete company funnel resources" ON funnel_resources
    FOR DELETE USING (
        funnel_id IN (
            SELECT f.id FROM funnels f
            JOIN companies c ON f.company_id = c.id
            WHERE c.whop_company_id = current_setting('app.current_company_id', true)
        )
    );

-- ===== CONVERSATIONS TABLE POLICIES =====
-- Users can only see conversations from their company
CREATE POLICY "Users can view company conversations" ON conversations
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can insert company conversations" ON conversations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can update company conversations" ON conversations
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies 
            WHERE whop_company_id = current_setting('app.current_company_id', true)
        )
    );

-- ===== MESSAGES TABLE POLICIES =====
-- Users can only see messages from their company's conversations
CREATE POLICY "Users can view company messages" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT conv.id FROM conversations conv
            JOIN companies c ON conv.company_id = c.id
            WHERE c.whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can insert company messages" ON messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT conv.id FROM conversations conv
            JOIN companies c ON conv.company_id = c.id
            WHERE c.whop_company_id = current_setting('app.current_company_id', true)
        )
    );

-- ===== FUNNEL_INTERACTIONS TABLE POLICIES =====
-- Users can only see funnel interactions from their company's conversations
CREATE POLICY "Users can view company funnel interactions" ON funnel_interactions
    FOR SELECT USING (
        conversation_id IN (
            SELECT conv.id FROM conversations conv
            JOIN companies c ON conv.company_id = c.id
            WHERE c.whop_company_id = current_setting('app.current_company_id', true)
        )
    );

CREATE POLICY "Users can insert company funnel interactions" ON funnel_interactions
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT conv.id FROM conversations conv
            JOIN companies c ON conv.company_id = c.id
            WHERE c.whop_company_id = current_setting('app.current_company_id', true)
        )
    );

-- ===== FUNNEL_ANALYTICS TABLE POLICIES =====
-- Users can only see analytics from their experience
CREATE POLICY "Users can view experience funnel analytics" ON funnel_analytics
    FOR SELECT USING (
        experience_id IN (
            SELECT id FROM experiences 
            WHERE id = current_setting('app.current_experience_id', true)
        )
    );

CREATE POLICY "Users can insert experience funnel analytics" ON funnel_analytics
    FOR INSERT WITH CHECK (
        experience_id IN (
            SELECT id FROM experiences 
            WHERE id = current_setting('app.current_experience_id', true)
        )
    );

CREATE POLICY "Users can update experience funnel analytics" ON funnel_analytics
    FOR UPDATE USING (
        experience_id IN (
            SELECT id FROM experiences 
            WHERE id = current_setting('app.current_experience_id', true)
        )
    );

-- Resource analytics policies
CREATE POLICY "Users can view experience funnel resource analytics" ON funnel_resource_analytics
    FOR SELECT USING (
        experience_id IN (
            SELECT id FROM experiences 
            WHERE id = current_setting('app.current_experience_id', true)
        )
    );

CREATE POLICY "Users can insert experience funnel resource analytics" ON funnel_resource_analytics
    FOR INSERT WITH CHECK (
        experience_id IN (
            SELECT id FROM experiences 
            WHERE id = current_setting('app.current_experience_id', true)
        )
    );

CREATE POLICY "Users can update experience funnel resource analytics" ON funnel_resource_analytics
    FOR UPDATE USING (
        experience_id IN (
            SELECT id FROM experiences 
            WHERE id = current_setting('app.current_experience_id', true)
        )
    );

-- ===== HELPER FUNCTIONS =====
-- Function to set current experience context
CREATE OR REPLACE FUNCTION set_current_experience(experience_id text)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_experience_id', experience_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current experience context
CREATE OR REPLACE FUNCTION get_current_experience()
RETURNS text AS $$
BEGIN
    RETURN current_setting('app.current_experience_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Legacy company functions for backward compatibility
CREATE OR REPLACE FUNCTION set_current_company(company_id text)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_company_id', company_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_company()
RETURNS text AS $$
BEGIN
    RETURN current_setting('app.current_company_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
