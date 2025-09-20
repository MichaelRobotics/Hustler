#!/usr/bin/env node

/**
 * Test quick link creation using Whop SDK - Fixed version
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Import the Whop SDK
import { WhopServerSdk } from '@whop/api';

async function testQuickLinkCreation() {
  console.log('🔍 Testing Quick Link Creation with Whop SDK');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const userId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  
  console.log('🔑 Environment Variables:');
  console.log(`   API Key: ${apiKey ? '✅ Found' : '❌ Missing'}`);
  console.log(`   Company ID: ${companyId}`);
  console.log(`   App ID: ${appId}`);
  console.log(`   User ID: ${userId}`);
  
  if (!apiKey || !companyId || !userId) {
    console.log('\n❌ Missing required environment variables');
    return;
  }
  
  try {
    // Initialize the Whop SDK
    console.log('\n🚀 Initializing Whop SDK...');
    const whopSdk = WhopServerSdk({
      appId: appId,
      appApiKey: apiKey,
      onBehalfOfUserId: userId,
      companyId: companyId,
    });
    
    console.log('✅ SDK initialized successfully');
    
    // Get the access pass details first
    console.log('\n🔍 Getting Access Pass Details...');
    const accessPassResponse = await whopSdk.accessPasses.getAccessPass({
      accessPassId: 'prod_VgRKhVC0TQnsE'
    });
    
    console.log('📊 Full Access Pass Response:');
    console.log(JSON.stringify(accessPassResponse, null, 2));
    
    // Extract the access pass data
    const accessPass = accessPassResponse.accessPass || accessPassResponse;
    
    if (accessPass) {
      console.log('\n📊 Access Pass Details:');
      console.log(`   ID: ${accessPass.id}`);
      console.log(`   Title: ${accessPass.title}`);
      console.log(`   Route: ${accessPass.route}`);
      console.log(`   Company: ${accessPass.company?.title}`);
      console.log(`   Company ID: ${accessPass.company?.id}`);
      
      // Check if this is the right product
      if (accessPass.route === 'test-ea-e887' || 
          accessPass.title?.toLowerCase().includes('leadcapture')) {
        console.log('   🎯 THIS IS YOUR TARGET PRODUCT!');
      } else {
        console.log('   ⚠️  This might not be your target product');
      }
    } else {
      console.log('❌ Could not extract access pass data from response');
    }
    
    // Check available methods
    console.log('\n🔍 Available SDK methods:');
    console.log('   whopSdk.plans methods:', Object.getOwnPropertyNames(whopSdk.plans));
    console.log('   whopSdk.accessPasses methods:', Object.getOwnPropertyNames(whopSdk.accessPasses));
    
    // Try to create quick link using different methods
    console.log('\n🚀 Attempting Quick Link Creation...');
    
    const quickLinkTests = [
      {
        name: 'Plans Create Quick Link',
        test: async () => {
          return await whopSdk.plans.createQuickLink({
            planId: 'prod_VgRKhVC0TQnsE',
            shortLink: 'profit-pulse-test',
            redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
          });
        }
      },
      {
        name: 'Access Pass Create Quick Link',
        test: async () => {
          return await whopSdk.accessPasses.createQuickLink({
            accessPassId: 'prod_VgRKhVC0TQnsE',
            shortLink: 'profit-pulse-test',
            redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
          });
        }
      }
    ];
    
    let success = false;
    
    for (const test of quickLinkTests) {
      console.log(`\n🧪 Trying: ${test.name}`);
      
      try {
        const result = await test.test();
        console.log(`   ✅ SUCCESS! Quick link created:`);
        console.log(`      Response: ${JSON.stringify(result, null, 2)}`);
        success = true;
        break;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        
        // Try to extract more details from the error
        if (error.message.includes('permission')) {
          console.log(`   🔍 This looks like a permission issue`);
        } else if (error.message.includes('not found')) {
          console.log(`   🔍 This looks like the endpoint doesn't exist`);
        } else if (error.message.includes('invalid')) {
          console.log(`   🔍 This looks like invalid parameters`);
        }
      }
    }
    
    if (!success) {
      console.log('\n❌ All quick link creation attempts failed');
      console.log('\n🔍 Analysis:');
      console.log('   1. The createQuickLink method might not exist in the SDK');
      console.log('   2. Your API key might not have the required permissions');
      console.log('   3. The method might have different parameter names');
      console.log('   4. Quick link creation might require different scopes');
      
      console.log('\n💡 Alternative approach:');
      console.log('   - Create the quick link manually in your Whop dashboard');
      console.log('   - Use the dashboard URL: https://whop.com/dashboard/biz_QG3JlRNIE910HW/marketing/tracking-links');
      console.log('   - Or check if there are other SDK methods for link management');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testQuickLinkCreation().then(() => {
  console.log('\n✅ Quick Link Creation Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Quick Link Creation Test failed:', error);
  process.exit(1);
});

