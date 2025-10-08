#!/usr/bin/env node

/**
 * Test Webhook using Whop SDK
 * 
 * This script uses the Whop SDK to test webhook events programmatically.
 * It simulates a membership.went_valid event using the official SDK method.
 */

const { WhopApi } = require('@whop/api');

// Configuration
const API_KEY = process.env.WHOP_API_KEY;
const WEBHOOK_ID = process.env.WHOP_WEBHOOK_ID; // Your webhook ID from dashboard

async function testWebhookWithSDK() {
  console.log('🚀 Testing Webhook with Whop SDK...\n');

  if (!API_KEY) {
    console.error('❌ Please set WHOP_API_KEY environment variable');
    process.exit(1);
  }

  if (!WEBHOOK_ID) {
    console.error('❌ Please set WHOP_WEBHOOK_ID environment variable');
    console.log('   You can find this in your Whop Developer Dashboard > Webhooks');
    process.exit(1);
  }

  try {
    // Initialize Whop API
    const whopApi = WhopApi({
      appApiKey: API_KEY,
    });

    console.log('📋 Configuration:');
    console.log(`   API Key: ${API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Webhook ID: ${WEBHOOK_ID}`);
    console.log('');

    // Test membership.went_valid webhook
    console.log('🧪 Testing membership.went_valid webhook...');
    
    const result = await whopApi.webhooks.testWebhook({
      event: 'membership.went_valid',
      id: WEBHOOK_ID
    });

    console.log('📊 Test Results:');
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response Body:`, result.body);
    
    if (result.success) {
      console.log('\n🎉 Webhook test completed successfully!');
      console.log('✅ Your webhook endpoint received the test event');
      console.log('✅ Check your Vercel logs to see the processing details');
    } else {
      console.log('\n⚠️  Webhook test failed');
      console.log('   Check your webhook configuration and endpoint');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('permission')) {
      console.log('\n💡 Make sure you have the "developer:manage_webhook" permission');
    }
    
    if (error.message.includes('not found')) {
      console.log('\n💡 Check that your webhook ID is correct');
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testWebhookWithSDK();
}

module.exports = { testWebhookWithSDK };
