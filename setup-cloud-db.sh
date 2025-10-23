#!/bin/bash

echo "🚀 Setting up Direct Database Connection to Supabase Cloud"
echo ""

echo "📋 Step 1: Get your database credentials"
echo "1. Go to your Supabase Dashboard"
echo "2. Navigate to Settings → Database"
echo "3. Copy the 'Connection string' under 'Connection parameters'"
echo ""

echo "📋 Step 2: Set your database URL"
echo "Run this command with your actual database URL:"
echo ""
echo "export SUPABASE_CLOUD_DB_URL='postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres'"
echo ""

echo "📋 Step 3: Test the connection"
echo "node migrate-to-cloud.js"
echo ""

echo "📋 Alternative: Set it in your .env file"
echo "Add this line to your .env.local file:"
echo "SUPABASE_CLOUD_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
echo ""

echo "🔍 Example of what your URL should look like:"
echo "postgresql://postgres:your-password-here@db.abcdefghijklmnop.supabase.co:5432/postgres"
