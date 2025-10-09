#!/bin/bash

# Whop Webhook Event Simulator using curl
# This script simulates realistic Whop webhook events

WEBHOOK_URL="https://hustler-omega.vercel.app/api/webhooks"
WEBHOOK_SECRET="${WHOP_WEBHOOK_SECRET:-your-webhook-secret-here}"

echo "🎭 Whop Webhook Event Simulator"
echo "════════════════════════════════════════════════════════════"
echo "🎯 Target: $WEBHOOK_URL"
echo "🔑 Secret: ${WEBHOOK_SECRET:0:8}..."
echo "════════════════════════════════════════════════════════════"

# Test 1: Basic connectivity test
echo "🔍 Test 1: Basic connectivity test..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": "connectivity"}' \
  -w "\n📊 Status: %{http_code}\n⏱️  Time: %{time_total}s\n" \
  -s
echo "────────────────────────────────────────────────────────────"

# Test 2: Membership went valid event (without signature - should fail)
echo "🔍 Test 2: Membership went valid (no signature - should fail)..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
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

# Test 3: Payment succeeded event (without signature - should fail)
echo "🔍 Test 3: Payment succeeded (no signature - should fail)..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.succeeded",
    "data": {
      "id": "pay_789123456",
      "user_id": "user_123456789",
      "product_id": "prod_987654321",
      "company_id": "company_111222333",
      "final_amount": 2999,
      "amount_after_fees": 2849,
      "currency": "USD",
      "status": "succeeded",
      "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
      "metadata": {
        "type": "subscription",
        "plan_name": "Premium Plan"
      }
    }
  }' \
  -w "\n📊 Status: %{http_code}\n⏱️  Time: %{time_total}s\n" \
  -s
echo "────────────────────────────────────────────────────────────"

echo "✅ Webhook simulation complete!"
echo ""
echo "📋 Expected Results:"
echo "• Test 1: Should return 401 (Invalid webhook signature)"
echo "• Test 2: Should return 401 (Invalid webhook signature)" 
echo "• Test 3: Should return 401 (Invalid webhook signature)"
echo ""
echo "📋 Next steps:"
echo "1. Check Vercel logs: vercel logs --follow"
echo "2. Look for webhook processing logs"
echo "3. If you see 401 errors, your webhook validation is working!"
echo "4. To test with valid signatures, use the Node.js simulator"

