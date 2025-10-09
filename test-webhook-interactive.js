#!/usr/bin/env node

/**
 * Interactive Webhook Test
 * 
 * This script prompts for your webhook secret and tests the endpoint
 */

const crypto = require('crypto');
const readline = require('readline');

const WEBHOOK_URL = 'https://hustler-omega.vercel.app/api/webhooks';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

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
async function sendWebhookEvent(eventName, eventData, secret) {
  try {
    console.log(`🚀 Testing ${eventName} webhook event...`);
    
    const payload = JSON.stringify(eventData);
    const signature = createWebhookSignature(payload, secret);
    
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
async function testWebhookEvents(secret) {
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
    const result = await sendWebhookEvent(event.name, event.data, secret);
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

/**
 * Main function
 */
async function main() {
  console.log('🎭 Interactive Webhook Test');
  console.log('═'.repeat(60));
  console.log(`🎯 Target: ${WEBHOOK_URL}`);
  console.log('═'.repeat(60));
  
  try {
    const secret = await askQuestion('🔑 Enter your WHOP_WEBHOOK_SECRET: ');
    
    if (!secret || secret.trim() === '') {
      console.log('❌ No secret provided. Exiting.');
      process.exit(1);
    }
    
    console.log(`🔑 Using secret: ${secret.substring(0, 8)}...`);
    console.log('');
    
    await testWebhookEvents(secret.trim());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebhookEvents, sendWebhookEvent };

