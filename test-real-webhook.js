#!/usr/bin/env node

/**
 * Test Real Webhook with Actual Secret
 * 
 * This script tests your webhook endpoint with the real WHOP_WEBHOOK_SECRET
 * to verify it's working correctly.
 */

const crypto = require('crypto');

const WEBHOOK_URL = 'https://hustler-omega.vercel.app/api/webhooks';
const WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error('❌ WHOP_WEBHOOK_SECRET environment variable is not set!');
  console.log('Please set it with: export WHOP_WEBHOOK_SECRET=your_actual_secret');
  process.exit(1);
}

console.log('🎭 Testing Real Webhook with Actual Secret');
console.log('═'.repeat(60));
console.log(`🎯 Target: ${WEBHOOK_URL}`);
console.log(`🔑 Secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
console.log('═'.repeat(60));

/**
 * Create a valid webhook signature
 */
function createWebhookSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}

/**
 * Send a webhook event with proper signature
 */
async function sendWebhookEvent(eventName, eventData) {
  try {
    console.log(`🚀 Testing ${eventName} webhook event...`);
    
    const payload = JSON.stringify(eventData);
    const signature = createWebhookSignature(payload, WEBHOOK_SECRET);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Whop-Signature': `sha256=${signature}`,
        'X-Whop-Timestamp': Math.floor(Date.now() / 1000).toString(),
        'User-Agent': 'Whop-Webhook/1.0'
      },
      body: payload
    });
    
    const responseText = await response.text();
    
    console.log(`📤 Event: ${eventName}`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response: ${responseText}`);
    
    if (response.ok) {
      console.log('✅ SUCCESS! Webhook processed correctly');
    } else {
      console.log('❌ FAILED! Check your webhook processing logic');
    }
    
    console.log('─'.repeat(60));
    
    return {
      success: response.ok,
      status: response.status,
      response: responseText
    };
    
  } catch (error) {
    console.error(`❌ Error sending ${eventName}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test webhook events
 */
async function testWebhookEvents() {
  const events = [
    {
      name: 'membership_went_valid',
      data: {
        action: "membership.went_valid",
        data: {
          user_id: "user_123456789",
          product_id: "prod_987654321", 
          page_id: "company_111222333",
          company_buyer_id: "company_111222333",
          membership_id: "mem_456789123",
          plan_id: null,
          created_at: new Date().toISOString(),
          status: "active"
        }
      }
    },
    {
      name: 'payment_succeeded',
      data: {
        action: "payment.succeeded",
        data: {
          id: "pay_789123456",
          user_id: "user_123456789",
          product_id: "prod_987654321",
          company_id: "company_111222333",
          final_amount: 2999,
          amount_after_fees: 2849,
          currency: "USD",
          status: "succeeded",
          created_at: new Date().toISOString(),
          metadata: {
            type: "subscription",
            plan_name: "Premium Plan"
          }
        }
      }
    }
  ];
  
  let successCount = 0;
  let totalCount = events.length;
  
  for (const event of events) {
    const result = await sendWebhookEvent(event.name, event.data);
    if (result.success) {
      successCount++;
    }
    
    // Wait between events
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎯 Test Results Summary:');
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 ALL TESTS PASSED! Your webhook is working perfectly!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Check Vercel logs: vercel logs --follow');
    console.log('2. Verify conversations are being created in your database');
    console.log('3. Test with real Whop events (membership/payment)');
  } else {
    console.log('⚠️  Some tests failed. Check your webhook processing logic.');
  }
}

// Run the test
if (require.main === module) {
  testWebhookEvents().catch(console.error);
}

module.exports = { testWebhookEvents, sendWebhookEvent };

