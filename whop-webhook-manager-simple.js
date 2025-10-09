#!/usr/bin/env node

/**
 * Whop Webhook Manager & Testing Suite (CommonJS Version)
 * 
 * Comprehensive webhook management using Whop SDK
 * - List existing webhooks
 * - Create new webhooks
 * - Test webhooks
 * - Update webhook configurations
 * - Thorough testing of webhook functionality
 */

const { whopSdk } = require('./lib/whop-sdk.ts');

const WEBHOOK_URL = 'https://hustler-omega.vercel.app/api/webhooks';
const COMPANY_ID = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

// Webhook events we want to subscribe to
const WEBHOOK_EVENTS = [
  'membership.went_valid',
  'membership.went_invalid', 
  'payment.succeeded',
  'payment.failed',
  'app_membership.went_valid',
  'app_membership.went_invalid',
  'app_payment.succeeded',
  'app_payment.failed'
];

/**
 * List all existing webhooks for the company
 */
async function listWebhooks() {
  try {
    console.log('🔍 Listing existing webhooks...');
    
    const result = await whopSdk.webhooks.listWebhooks({
      companyId: COMPANY_ID
    });
    
    console.log('📋 Existing Webhooks:');
    console.log('═'.repeat(60));
    
    if (result.webhooks && result.webhooks.length > 0) {
      result.webhooks.forEach((webhook, index) => {
        console.log(`${index + 1}. ID: ${webhook.id}`);
        console.log(`   URL: ${webhook.url}`);
        console.log(`   Events: ${webhook.events?.join(', ') || 'N/A'}`);
        console.log(`   Enabled: ${webhook.enabled ? '✅' : '❌'}`);
        console.log(`   Created: ${new Date(webhook.createdAt * 1000).toISOString()}`);
        console.log('─'.repeat(40));
      });
    } else {
      console.log('📭 No webhooks found');
    }
    
    return result.webhooks || [];
    
  } catch (error) {
    console.error('❌ Error listing webhooks:', error.message);
    return [];
  }
}

/**
 * Create a new webhook
 */
async function createWebhook() {
  try {
    console.log('🚀 Creating new webhook...');
    console.log(`🎯 URL: ${WEBHOOK_URL}`);
    console.log(`📡 Events: ${WEBHOOK_EVENTS.join(', ')}`);
    
    const result = await whopSdk.webhooks.createWebhook({
      url: WEBHOOK_URL,
      apiVersion: 'v2',
      enabled: true,
      events: WEBHOOK_EVENTS,
      resourceId: COMPANY_ID
    });
    
    console.log('✅ Webhook created successfully!');
    console.log('📋 Webhook Details:');
    console.log(`   ID: ${result.id}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Secret: ${result.webhookSecret?.substring(0, 8)}...`);
    console.log(`   Events: ${result.events?.join(', ')}`);
    console.log(`   Enabled: ${result.enabled ? '✅' : '❌'}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error creating webhook:', error.message);
    throw error;
  }
}

/**
 * Get details of a specific webhook
 */
async function getWebhook(webhookId) {
  try {
    console.log(`🔍 Getting webhook details for: ${webhookId}`);
    
    const result = await whopSdk.webhooks.getWebhook({
      webhookId: webhookId,
      companyId: COMPANY_ID
    });
    
    console.log('📋 Webhook Details:');
    console.log('═'.repeat(60));
    console.log(`ID: ${result.webhook.id}`);
    console.log(`URL: ${result.webhook.url}`);
    console.log(`API Version: ${result.webhook.apiVersion}`);
    console.log(`Events: ${result.webhook.events?.join(', ')}`);
    console.log(`Enabled: ${result.webhook.enabled ? '✅' : '❌'}`);
    console.log(`Created: ${new Date(result.webhook.createdAt * 1000).toISOString()}`);
    console.log(`Secret: ${result.webhook.webhookSecret?.substring(0, 8)}...`);
    
    return result.webhook;
    
  } catch (error) {
    console.error('❌ Error getting webhook:', error.message);
    throw error;
  }
}

/**
 * Test a webhook by sending a test event
 */
async function testWebhook(webhookId, eventType = 'membership.went_valid') {
  try {
    console.log(`🧪 Testing webhook: ${webhookId}`);
    console.log(`📡 Event type: ${eventType}`);
    
    const result = await whopSdk.webhooks.testWebhook({
      id: webhookId,
      event: eventType
    });
    
    console.log('📊 Test Results:');
    console.log('═'.repeat(60));
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Status: ${result.status}`);
    console.log(`Response: ${JSON.stringify(result.body, null, 2)}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
    throw error;
  }
}

/**
 * Update webhook configuration
 */
async function updateWebhook(webhookId, updates = {}) {
  try {
    console.log(`🔄 Updating webhook: ${webhookId}`);
    
    const result = await whopSdk.webhooks.updateWebhook({
      id: webhookId,
      ...updates
    });
    
    console.log('✅ Webhook updated successfully!');
    console.log('📋 Updated Details:');
    console.log(`   ID: ${result.id}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Events: ${result.events?.join(', ')}`);
    console.log(`   Enabled: ${result.enabled ? '✅' : '❌'}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error updating webhook:', error.message);
    throw error;
  }
}

/**
 * Comprehensive webhook testing suite
 */
async function runComprehensiveTest() {
  console.log('🎭 Whop Webhook Comprehensive Testing Suite');
  console.log('═'.repeat(80));
  console.log(`🎯 Target URL: ${WEBHOOK_URL}`);
  console.log(`🏢 Company ID: ${COMPANY_ID}`);
  console.log(`📡 Events: ${WEBHOOK_EVENTS.join(', ')}`);
  console.log('═'.repeat(80));
  
  try {
    // Step 1: List existing webhooks
    console.log('\n📋 STEP 1: List Existing Webhooks');
    console.log('─'.repeat(40));
    const existingWebhooks = await listWebhooks();
    
    // Step 2: Create new webhook if none exist
    let webhookId;
    if (existingWebhooks.length === 0) {
      console.log('\n🚀 STEP 2: Create New Webhook');
      console.log('─'.repeat(40));
      const newWebhook = await createWebhook();
      webhookId = newWebhook.id;
    } else {
      console.log('\n📋 STEP 2: Using Existing Webhook');
      console.log('─'.repeat(40));
      webhookId = existingWebhooks[0].id;
      console.log(`Using existing webhook: ${webhookId}`);
    }
    
    // Step 3: Get webhook details
    console.log('\n🔍 STEP 3: Get Webhook Details');
    console.log('─'.repeat(40));
    const webhookDetails = await getWebhook(webhookId);
    
    // Step 4: Test webhook with different events
    console.log('\n🧪 STEP 4: Test Webhook Events');
    console.log('─'.repeat(40));
    
    const testEvents = [
      'membership.went_valid',
      'payment.succeeded',
      'app_membership.went_valid'
    ];
    
    for (const eventType of testEvents) {
      console.log(`\n🧪 Testing event: ${eventType}`);
      try {
        const testResult = await testWebhook(webhookId, eventType);
        console.log(`✅ Test completed for ${eventType}`);
      } catch (error) {
        console.log(`❌ Test failed for ${eventType}: ${error.message}`);
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 COMPREHENSIVE TEST COMPLETED!');
    console.log('═'.repeat(80));
    console.log('📋 Summary:');
    console.log(`✅ Webhook ID: ${webhookId}`);
    console.log(`✅ URL: ${webhookDetails.url}`);
    console.log(`✅ Events: ${webhookDetails.events?.join(', ')}`);
    console.log(`✅ Enabled: ${webhookDetails.enabled ? 'Yes' : 'No'}`);
    console.log(`✅ Secret: ${webhookDetails.webhookSecret?.substring(0, 8)}...`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Monitor Vercel logs: vercel logs --follow');
    console.log('2. Test with real Whop events (membership/payment)');
    console.log('3. Verify conversation creation in database');
    console.log('4. Check webhook processing logs');
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
    throw error;
  }
}

/**
 * Simple webhook setup for testing
 */
async function setupWebhookForTesting() {
  console.log('🎭 Setting up webhook for testing...');
  console.log('═'.repeat(60));
  
  try {
    // Check if webhooks already exist
    const existingWebhooks = await listWebhooks();
    
    if (existingWebhooks.length > 0) {
      console.log('✅ Webhooks already exist, using first one for testing');
      const webhook = existingWebhooks[0];
      console.log(`📋 Using webhook: ${webhook.id}`);
      console.log(`🔗 URL: ${webhook.url}`);
      console.log(`📡 Events: ${webhook.events?.join(', ')}`);
      return webhook;
    } else {
      console.log('🚀 No webhooks found, creating new one...');
      const newWebhook = await createWebhook();
      console.log('✅ New webhook created successfully!');
      return newWebhook;
    }
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test') || args.includes('-t')) {
    runComprehensiveTest().catch(console.error);
  } else if (args.includes('--setup') || args.includes('-s')) {
    setupWebhookForTesting().catch(console.error);
  } else {
    console.log('🎭 Whop Webhook Manager');
    console.log('═'.repeat(60));
    console.log('Usage:');
    console.log('  node whop-webhook-manager-simple.js --test    # Run comprehensive test');
    console.log('  node whop-webhook-manager-simple.js --setup   # Setup webhook for testing');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  NEXT_PUBLIC_WHOP_COMPANY_ID');
    console.log('  WHOP_API_KEY');
    console.log('  NEXT_PUBLIC_WHOP_APP_ID');
  }
}

module.exports = {
  listWebhooks,
  createWebhook,
  getWebhook,
  testWebhook,
  updateWebhook,
  runComprehensiveTest,
  setupWebhookForTesting
};

