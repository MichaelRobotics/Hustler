-- Manual Migration to Supabase Cloud Database
-- Copy and paste this SQL into your Supabase Dashboard → SQL Editor

-- Add new fields to resources table
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS storage_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN resources.price IS 'Price from access pass plan or user input';
COMMENT ON COLUMN resources.image IS 'Link to icon of app/product/digital resource image';
COMMENT ON COLUMN resources.storage_url IS 'Link that triggers digital asset upload';

-- Verify the migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'resources' 
AND column_name IN ('price', 'image', 'storage_url')
ORDER BY column_name;
