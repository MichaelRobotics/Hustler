-- Add new fields to resources table
ALTER TABLE resources 
ADD COLUMN price DECIMAL(10,2),
ADD COLUMN image TEXT,
ADD COLUMN storage_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN resources.price IS 'Price from access pass plan or user input';
COMMENT ON COLUMN resources.image IS 'Link to icon of app/product/digital resource image';
COMMENT ON COLUMN resources.storage_url IS 'Link that triggers digital asset upload';
