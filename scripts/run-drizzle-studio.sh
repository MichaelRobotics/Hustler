#!/bin/bash

# Script to run Drizzle Studio with optimized connection settings
echo "🚀 Starting Drizzle Studio with optimized connection settings..."

# Kill any existing Drizzle Studio processes
pkill -f "drizzle-kit studio" || true

# Wait a moment for processes to close
sleep 2

# Set connection limits for Drizzle Studio
export DRIZZLE_STUDIO_MAX_CONNECTIONS=3
export DRIZZLE_STUDIO_IDLE_TIMEOUT=10

# Run Drizzle Studio with the studio-specific config
npx drizzle-kit studio --config drizzle.studio.config.ts

echo "✅ Drizzle Studio started successfully!"
echo "📊 Studio URL: http://localhost:3001"
echo "🔗 Database: Supabase (Pooled Connection)"
