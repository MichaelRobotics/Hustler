#!/usr/bin/env node

/**
 * Complete User Join Scenario Test
 * 
 * This script tests the complete user join scenario where a user joins
 * a Whop company where your app is installed. It uses multiple approaches:
 * 1. Direct webhook simulation with proper signatures
 * 2. Whop SDK test webhook functionality
 * 3. Manual webhook data validation
 */

const { simulateUserJoin } = require('./simulate-user-join.js');
const { testWebhookWithSDK } = require('./test-webhook-sdk.js');

async function runCompleteTest() {
  console.log('🎯 Complete User Join Scenario Test\n');
  console.log('=' .repeat(50));
  
  // Test 1: Direct webhook simulation
  console.log('\n📡 Test 1: Direct Webhook Simulation');
  console.log('-'.repeat(30));
  try {
    await simulateUserJoin();
    console.log('✅ Direct webhook simulation completed');
  } catch (error) {
    console.log('❌ Direct webhook simulation failed:', error.message);
  }

  // Test 2: SDK webhook test
  console.log('\n🔧 Test 2: Whop SDK Webhook Test');
  console.log('-'.repeat(30));
  try {
    await testWebhookWithSDK();
    console.log('✅ SDK webhook test completed');
  } catch (error) {
    console.log('❌ SDK webhook test failed:', error.message);
  }

  // Test 3: Manual validation
  console.log('\n🔍 Test 3: Manual Webhook Data Validation');
  console.log('-'.repeat(30));
  
  const testData = {
    action: "membership.went_valid",
    api_version: "v5",
    data: {
      id: "mem_test123",
      product_id: "prod_test456", 
      user_id: "user_test789",
      plan_id: "plan_test101",
      page_id: "biz_st7EmGwWgskri5", // Your installed company
      created_at: Math.floor(Date.now() / 1000),
      status: "completed",
      valid: true,
      company_buyer_id: null,
      marketplace: false
    }
  };

  console.log('📦 Test webhook data structure:');
  console.log(JSON.stringify(testData, null, 2));
  
  // Validate required fields
  const requiredFields = ['action', 'data.id', 'data.user_id', 'data.product_id', 'data.page_id'];
  const missingFields = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], testData);
    return !value;
  });

  if (missingFields.length === 0) {
    console.log('✅ All required fields present');
  } else {
    console.log('❌ Missing required fields:', missingFields);
  }

  console.log('\n🎯 Test Summary:');
  console.log('=' .repeat(50));
  console.log('✅ Webhook simulation script created');
  console.log('✅ SDK test script created'); 
  console.log('✅ Manual validation completed');
  console.log('\n💡 Next Steps:');
  console.log('   1. Set WHOP_WEBHOOK_SECRET environment variable');
  console.log('   2. Set WHOP_API_KEY environment variable (for SDK test)');
  console.log('   3. Set WHOP_WEBHOOK_ID environment variable (for SDK test)');
  console.log('   4. Run: node simulate-user-join.js');
  console.log('   5. Run: node test-webhook-sdk.js');
  console.log('   6. Check your Vercel logs for webhook processing');
}

// Run the complete test
if (require.main === module) {
  runCompleteTest();
}

module.exports = { runCompleteTest };
