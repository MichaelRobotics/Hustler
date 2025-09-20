#!/usr/bin/env node

/**
 * Final test for quick link creation - check available methods
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Import the Whop SDK
import { WhopServerSdk } from '@whop/api';

async function testFinalQuickLink() {
  console.log('🔍 Final Quick Link Creation Test');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const userId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  
  try {
    // Initialize the Whop SDK
    const whopSdk = WhopServerSdk({
      appId: appId,
      appApiKey: apiKey,
      onBehalfOfUserId: userId,
      companyId: companyId,
    });
    
    console.log('✅ SDK initialized successfully');
    
    // Check available methods
    console.log('\n🔍 Available SDK methods:');
    
    if (whopSdk.plans) {
      console.log('   whopSdk.plans methods:', Object.getOwnPropertyNames(whopSdk.plans));
    } else {
      console.log('   whopSdk.plans: undefined');
    }
    
    if (whopSdk.accessPasses) {
      console.log('   whopSdk.accessPasses methods:', Object.getOwnPropertyNames(whopSdk.accessPasses));
    } else {
      console.log('   whopSdk.accessPasses: undefined');
    }
    
    // Check if createQuickLink exists
    const hasPlansCreateQuickLink = whopSdk.plans && typeof whopSdk.plans.createQuickLink === 'function';
    const hasAccessPassCreateQuickLink = whopSdk.accessPasses && typeof whopSdk.accessPasses.createQuickLink === 'function';
    
    console.log('\n📊 Quick Link Methods Available:');
    console.log(`   whopSdk.plans.createQuickLink: ${hasPlansCreateQuickLink ? '✅' : '❌'}`);
    console.log(`   whopSdk.accessPasses.createQuickLink: ${hasAccessPassCreateQuickLink ? '✅' : '❌'}`);
    
    if (!hasPlansCreateQuickLink && !hasAccessPassCreateQuickLink) {
      console.log('\n❌ No createQuickLink methods found in the SDK');
      console.log('\n💡 Conclusion:');
      console.log('   - The Whop SDK does not currently support programmatic quick link creation');
      console.log('   - You need to create quick links manually in the Whop dashboard');
      console.log('   - Dashboard URL: https://whop.com/dashboard/biz_QG3JlRNIE910HW/marketing/tracking-links');
      
      console.log('\n🔍 Alternative Solutions:');
      console.log('   1. Create quick links manually in the dashboard');
      console.log('   2. Use the existing affiliate link format: ?app={yourAppId}');
      console.log('   3. Check if there are other Whop API endpoints for link management');
      console.log('   4. Contact Whop support to request this feature');
      
      return;
    }
    
    // Try to create quick link if methods exist
    console.log('\n🚀 Attempting Quick Link Creation...');
    
    if (hasPlansCreateQuickLink) {
      try {
        console.log('\n🧪 Trying whopSdk.plans.createQuickLink...');
        const result = await whopSdk.plans.createQuickLink({
          planId: 'prod_VgRKhVC0TQnsE',
          shortLink: 'profit-pulse-test',
          redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
        });
        console.log('   ✅ SUCCESS!', result);
      } catch (error) {
        console.log('   ❌ Error:', error.message);
      }
    }
    
    if (hasAccessPassCreateQuickLink) {
      try {
        console.log('\n🧪 Trying whopSdk.accessPasses.createQuickLink...');
        const result = await whopSdk.accessPasses.createQuickLink({
          accessPassId: 'prod_VgRKhVC0TQnsE',
          shortLink: 'profit-pulse-test',
          redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
        });
        console.log('   ✅ SUCCESS!', result);
      } catch (error) {
        console.log('   ❌ Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFinalQuickLink().then(() => {
  console.log('\n✅ Final Quick Link Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Final Quick Link Test failed:', error);
  process.exit(1);
});

