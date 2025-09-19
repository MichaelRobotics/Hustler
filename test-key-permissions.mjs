#!/usr/bin/env node

/**
 * Test script to check what permissions our Whop keys have
 */

import { whopSdk } from './lib/whop-sdk.ts';

async function testKeyPermissions() {
  console.log('🔑 Testing Whop Key Permissions...\n');

  try {
    // Test 1: Check what we can access with our current keys
    console.log('📋 Current keys:');
    console.log(`App ID: ${process.env.NEXT_PUBLIC_WHOP_APP_ID}`);
    console.log(`Company ID: ${process.env.NEXT_PUBLIC_WHOP_COMPANY_ID}`);
    console.log(`Agent User ID: ${process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID}`);
    console.log(`API Key: ${process.env.WHOP_API_KEY?.substring(0, 10)}...`);

    // Test 2: Try different SDK methods
    console.log('\n📋 Testing SDK methods...');
    
    const methods = [
      { name: 'companies.getCompany', method: () => whopSdk.companies.getCompany() },
      { name: 'companies.listPlans', method: () => whopSdk.companies.listPlans() },
      { name: 'companies.listMembers', method: () => whopSdk.companies.listMembers() },
      { name: 'companies.listMemberships', method: () => whopSdk.companies.listMemberships() },
      { name: 'payments.createCheckoutSession', method: () => whopSdk.payments.createCheckoutSession({ planId: 'test' }) },
      { name: 'users.getUser', method: () => whopSdk.users.getUser({ id: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID }) }
    ];

    for (const { name, method } of methods) {
      try {
        console.log(`\n🧪 Testing ${name}...`);
        const result = await method();
        console.log(`✅ ${name} - Success`);
        console.log(`   Result keys:`, Object.keys(result || {}));
      } catch (error) {
        console.log(`❌ ${name} - Failed: ${error.message}`);
      }
    }

    // Test 3: Check if we can access other companies
    console.log('\n📋 Testing multi-tenant access...');
    
    try {
      // Try to get company info for the target company
      const targetCompanyId = 'biz_VjqUDhcKO2cAuG';
      console.log(`\n🧪 Testing access to company ${targetCompanyId}...`);
      
      // Try with company context
      const companySdk = whopSdk.withCompany(targetCompanyId);
      const companyResult = await companySdk.companies.getCompany();
      console.log(`✅ Can access company ${targetCompanyId}:`, companyResult.id);
      
    } catch (error) {
      console.log(`❌ Cannot access target company: ${error.message}`);
    }

    // Test 4: Check if we can create checkout sessions
    console.log('\n📋 Testing checkout session creation...');
    
    try {
      // First get a real plan ID
      const plans = await whopSdk.companies.listPlans();
      if (plans.plans && plans.plans.length > 0) {
        const planId = plans.plans[0].id;
        console.log(`\n🧪 Testing checkout session for plan ${planId}...`);
        
        const checkoutSession = await whopSdk.payments.createCheckoutSession({
          planId: planId,
          metadata: {
            funnelId: 'test_funnel',
            blockId: 'test_block',
            test: true
          }
        });
        
        console.log(`✅ Checkout session created:`, checkoutSession.id);
        console.log(`   URL: ${checkoutSession.url}`);
        console.log(`   Metadata:`, checkoutSession.metadata);
        
      } else {
        console.log('❌ No plans available to test checkout session');
      }
    } catch (error) {
      console.log(`❌ Cannot create checkout session: ${error.message}`);
    }

    // Test 5: Check webhook capabilities
    console.log('\n📋 Testing webhook capabilities...');
    
    try {
      const webhooks = await whopSdk.webhooks.listWebhooks();
      console.log(`✅ Webhooks accessible: ${webhooks.webhooks?.length || 0} found`);
      
      if (webhooks.webhooks && webhooks.webhooks.length > 0) {
        console.log(`   Webhook endpoints:`, webhooks.webhooks.map(w => w.url));
      }
    } catch (error) {
      console.log(`❌ Cannot access webhooks: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Permission test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testAlternativeKeys() {
  console.log('\n🔍 Testing Alternative Key Approaches...\n');

  console.log('📋 What we know about your keys:');
  console.log('✅ App ID: app_FInBMCJGyVdD9T (your app)');
  console.log('✅ Company ID: biz_QG3JlRNIE910HW (your company)');
  console.log('✅ Agent User ID: user_23pKfUV4sWNlH (your agent user)');
  console.log('✅ API Key: Pqm2m96bR6B6fyX11TJI4J2Pbjpg-dj3sp60X4NPH5Q (your app key)');

  console.log('\n📋 Key limitations:');
  console.log('❌ API Key is for YOUR app only');
  console.log('❌ Cannot access other companies\' data');
  console.log('❌ Cannot create tracking links for other companies');
  console.log('❌ Limited to your own company scope');

  console.log('\n📋 What you CAN do:');
  console.log('✅ Receive webhooks from ANY company where your app is installed');
  console.log('✅ Process webhook data for funnel attribution');
  console.log('✅ Create checkout sessions with metadata');
  console.log('✅ Use database correlation for tracking');

  console.log('\n💡 Recommended approach:');
  console.log('1. Use webhook data (you already receive this)');
  console.log('2. Store funnel context in your database');
  console.log('3. Correlate webhook data with stored context');
  console.log('4. No need for API-created tracking links');
}

// Run the tests
async function main() {
  console.log('🚀 Starting Key Permissions Test\n');
  console.log('=' .repeat(50));
  
  await testKeyPermissions();
  await testAlternativeKeys();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test completed');
}

main().catch(console.error);
