-- Add my_affiliate_link field to conversations table
-- This field will store the affiliate link for each conversation

-- Add the my_affiliate_link column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS my_affiliate_link text;

-- Add comment for documentation
COMMENT ON COLUMN conversations.my_affiliate_link IS 'Affiliate link for this conversation';
