#!/bin/bash

echo "🚀 Setting up direct migration to Supabase Cloud Database"
echo ""

# Step 1: Login to Supabase
echo "1️⃣ Logging into Supabase..."
npx supabase login

# Step 2: Link your project
echo ""
echo "2️⃣ Linking your project..."
echo "You'll need your project reference ID from your Supabase dashboard"
echo "Run: npx supabase link --project-ref YOUR_PROJECT_REF"
echo ""

# Step 3: Apply migration
echo "3️⃣ Applying migration to cloud database..."
echo "After linking, run: npx supabase db push --linked"
echo ""

echo "📋 Alternative: Manual SQL execution"
echo "Go to your Supabase dashboard → SQL Editor and run:"
echo ""
cat << 'EOF'
-- Add new fields to resources table
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS image TEXT,
ADD COLUMN IF NOT EXISTS storage_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN resources.price IS 'Price from access pass plan or user input';
COMMENT ON COLUMN resources.image IS 'Link to icon of app/product/digital resource image';
COMMENT ON COLUMN resources.storage_url IS 'Link that triggers digital asset upload';
EOF
