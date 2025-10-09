#!/bin/bash

# Simple webhook test with your actual secret
# Usage: WHOP_WEBHOOK_SECRET=your_secret ./test-webhook-simple.sh

WEBHOOK_URL="https://hustler-omega.vercel.app/api/webhooks"
WEBHOOK_SECRET="${WHOP_WEBHOOK_SECRET}"

if [ -z "$WEBHOOK_SECRET" ]; then
    echo "❌ Please set WHOP_WEBHOOK_SECRET environment variable"
    echo "Usage: WHOP_WEBHOOK_SECRET=your_secret ./test-webhook-simple.sh"
    exit 1
fi

echo "🎭 Testing Webhook with Real Secret"
echo "════════════════════════════════════════════════════════════"
echo "🎯 Target: $WEBHOOK_URL"
echo "🔑 Secret: ${WEBHOOK_SECRET:0:8}..."
echo "════════════════════════════════════════════════════════════"

# Test 1: Membership went valid event
echo "🔍 Test 1: Membership went valid event..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Whop-Signature: sha256=$(echo -n '{"action":"membership.went_valid","data":{"user_id":"user_123","product_id":"prod_456","page_id":"company_789","membership_id":"mem_123","status":"active"}}' | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -binary | base64)" \
  -H "X-Whop-Timestamp: $(date +%s)" \
  -d '{
    "action": "membership.went_valid",
    "data": {
      "user_id": "user_123456789",
      "product_id": "prod_987654321",
      "page_id": "company_111222333",
      "company_buyer_id": "company_111222333",
      "membership_id": "mem_456789123",
      "plan_id": null,
      "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
      "status": "active"
    }
  }' \
  -w "\n📊 Status: %{http_code}\n⏱️  Time: %{time_total}s\n" \
  -s
echo "────────────────────────────────────────────────────────────"

echo "✅ Test complete!"
echo ""
echo "📋 Expected Results:"
echo "• Status 200: Webhook processed successfully"
echo "• Status 401: Invalid signature (check your secret)"
echo "• Status 500: Webhook processing error (check logs)"
echo ""
echo "📋 Next steps:"
echo "1. If 200: Check Vercel logs for processing details"
echo "2. If 401: Verify your WHOP_WEBHOOK_SECRET matches Whop dashboard"
echo "3. If 500: Check your webhook processing logic"

