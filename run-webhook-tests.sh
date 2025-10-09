#!/bin/bash

# Whop Webhook Testing Runner
# Comprehensive webhook testing and management

echo "🎭 Whop Webhook Testing Suite"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$WHOP_WEBHOOK_SECRET" ]; then
    echo "❌ WHOP_WEBHOOK_SECRET is not set"
    echo "Please set it with: export WHOP_WEBHOOK_SECRET=your_actual_secret"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_WHOP_COMPANY_ID" ]; then
    echo "❌ NEXT_PUBLIC_WHOP_COMPANY_ID is not set"
    echo "Please set it with: export NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Test 1: Direct webhook testing
echo "🧪 Test 1: Direct Webhook Testing"
echo "────────────────────────────────────────────────────────────"
node test-webhook-direct.js
echo ""

# Test 2: SDK webhook management (if available)
echo "🔧 Test 2: SDK Webhook Management"
echo "────────────────────────────────────────────────────────────"
if [ -f "whop-webhook-manager-simple.js" ]; then
    echo "Setting up webhook for testing..."
    node whop-webhook-manager-simple.js --setup
    echo ""
    echo "Running comprehensive tests..."
    node whop-webhook-manager-simple.js --test
else
    echo "⚠️  SDK webhook manager not available"
fi

echo ""
echo "🎉 Webhook Testing Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo "1. Check Vercel logs: vercel logs --follow"
echo "2. Verify conversations are being created in your database"
echo "3. Test with real Whop events (membership/payment)"
echo "4. Monitor webhook processing performance"
echo ""
echo "📚 For detailed setup instructions, see: WEBHOOK_SETUP_GUIDE.md"

