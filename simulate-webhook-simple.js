#!/usr/bin/env node

/**
 * Simple Whop Webhook Event Simulator
 * 
 * This script simulates realistic Whop webhook events to test your webhook endpoint.
 */

const crypto = require('crypto');

const WEBHOOK_URL = 'https://hustler-omega.vercel.app/api/webhooks';
const WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || 'your-webhook-secret-here';

// Sample webhook events based on Whop documentation
const WEBHOOK_EVENTS = {
  membership_went_valid: {
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
  },
  
  payment_succeeded: {
    action: "payment.succeeded",
    data: {
      id: "pay_789123456",
      user_id: "user_123456789",
      product_id: "prod_987654321",
      company_id: "company_111222333",
      final_amount: 2999, // $29.99 in cents
      amount_after_fees: 2849, // After processing fees
      currency: "USD",
      status: "succeeded",
      created_at: new Date().toISOString(),
      metadata: {
        type: "subscription",
        plan_name: "Premium Plan"
      }
    }
  }
};

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
    console.log(`🚀 Simulating ${eventName} webhook event...`);
    
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
 * Test webhook endpoint connectivity
 */
async function testConnectivity() {
  console.log('🔍 Testing webhook endpoint connectivity...');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'connectivity' })
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Response: ${await response.text()}`);
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('❌ Connectivity test failed:', error.message);
  }
}

/**
 * Main simulation function
 */
async function simulateWebhookEvents() {
  console.log('🎭 Whop Webhook Event Simulator');
  console.log('═'.repeat(60));
  console.log(`🎯 Target: ${WEBHOOK_URL}`);
  console.log(`🔑 Secret: ${WEBHOOK_SECRET.substring(0, 8)}...`);
  console.log('═'.repeat(60));
  
  // Test connectivity first
  await testConnectivity();
  
  // Simulate different webhook events
  const events = ['membership_went_valid', 'payment_succeeded'];
  
  for (const eventName of events) {
    const eventData = WEBHOOK_EVENTS[eventName];
    if (eventData) {
      await sendWebhookEvent(eventName, eventData);
      
      // Wait between events
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('✅ Webhook simulation complete!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Check Vercel logs: vercel logs --follow');
  console.log('2. Look for webhook processing logs');
  console.log('3. Verify conversation creation in database');
}

// Run the simulation
if (require.main === module) {
  simulateWebhookEvents().catch(console.error);
}

module.exports = { simulateWebhookEvents, sendWebhookEvent, WEBHOOK_EVENTS };

