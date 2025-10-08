#!/bin/bash

# Setup Environment for Webhook Testing
# This script helps you set up the environment variables needed for webhook testing

echo "🔧 Setting up Webhook Test Environment"
echo "====================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    touch .env
fi

echo ""
echo "📋 Required Environment Variables:"
echo ""

# WHOP_WEBHOOK_SECRET
echo "1. WHOP_WEBHOOK_SECRET"
echo "   - Get this from your Whop Developer Dashboard > Webhooks"
echo "   - Add to .env: WHOP_WEBHOOK_SECRET=your_webhook_secret_here"
echo ""

# WHOP_API_KEY  
echo "2. WHOP_API_KEY"
echo "   - Get this from your Whop Developer Dashboard > API Keys"
echo "   - Add to .env: WHOP_API_KEY=your_api_key_here"
echo ""

# WHOP_WEBHOOK_ID
echo "3. WHOP_WEBHOOK_ID"
echo "   - Get this from your Whop Developer Dashboard > Webhooks"
echo "   - Add to .env: WHOP_WEBHOOK_ID=your_webhook_id_here"
echo ""

echo "🚀 After setting up environment variables, run:"
echo "   source .env"
echo "   node simulate-user-join.js"
echo "   node test-webhook-sdk.js"
echo ""

echo "📖 Available Test Scripts:"
echo "   - simulate-user-join.js     : Direct webhook simulation"
echo "   - test-webhook-sdk.js        : SDK-based webhook testing"
echo "   - test-user-join-scenario.js : Complete test suite"
echo ""

echo "✅ Environment setup guide completed!"
