-- Remove logo field and add subscription field to experiences table
-- This migration removes the logo column and adds a subscription enum field

-- Drop the logo column
ALTER TABLE experiences 
DROP COLUMN IF EXISTS logo;

-- Create the subscription_type enum
DO $$ BEGIN
    CREATE TYPE subscription_type AS ENUM ('Basic', 'Pro', 'Vip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the subscription column (nullable to allow existing rows to migrate gracefully)
ALTER TABLE experiences 
ADD COLUMN IF NOT EXISTS subscription subscription_type;

-- Add comment for documentation
COMMENT ON COLUMN experiences.subscription IS 'Subscription tier for this experience: Basic, Pro, or Vip';







