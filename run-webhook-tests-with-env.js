#!/usr/bin/env node

/**
 * Webhook Tests with Environment Variables
 * 
 * Runs webhook tests using environment variables
 */

const { testWebhookEvents, testConnectivity, runTests } = require('./test-webhook-direct.js');

async function runTestsWithEnv() {
  console.log('🎭 Whop Webhook Tests with Environment Variables');
  console.log('═'.repeat(60));
  
  // Check environment variables
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  const apiKey = process.env.WHOP_API_KEY;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  
  console.log('🔍 Environment Variables Check:');
  console.log(`   WHOP_WEBHOOK_SECRET: ${webhookSecret ? '✅ Set' : '❌ Not set'}`);
  console.log(`   NEXT_PUBLIC_WHOP_COMPANY_ID: ${companyId ? '✅ Set' : '❌ Not set'}`);
  console.log(`   WHOP_API_KEY: ${apiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`   NEXT_PUBLIC_WHOP_APP_ID: ${appId ? '✅ Set' : '❌ Not set'}`);
  console.log('');
  
  if (!webhookSecret) {
    console.log('❌ WHOP_WEBHOOK_SECRET is required for webhook testing');
    console.log('');
    console.log('📋 To set your webhook secret:');
    console.log('   export WHOP_WEBHOOK_SECRET=your_actual_secret_from_whop_dashboard');
    console.log('');
    console.log('📋 Then run:');
    console.log('   node run-webhook-tests-with-env.js');
    console.log('');
    console.log('🔍 Or run with inline secret:');
    console.log('   WHOP_WEBHOOK_SECRET=your_secret node run-webhook-tests-with-env.js');
    return;
  }
  
  console.log(`🔑 Using webhook secret: ${webhookSecret.substring(0, 8)}...`);
  console.log('');
  
  try {
    // Run the tests
    await runTests();
    
    console.log('');
    console.log('🎉 Webhook tests completed!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Check Vercel logs: vercel logs --follow');
    console.log('2. Verify conversations are being created in your database');
    console.log('3. Test with real Whop events (membership/payment)');
    console.log('4. Monitor webhook processing performance');
    
  } catch (error) {
    console.error('❌ Webhook tests failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runTestsWithEnv().catch(console.error);
}

module.exports = { runTestsWithEnv };

