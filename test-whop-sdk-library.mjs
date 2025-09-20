#!/usr/bin/env node

/**
 * Test Whop SDK as a library (not REST endpoints)
 * This tests the actual SDK functionality with minimal scopes
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Import the Whop SDK
import { WhopServerSdk } from '@whop/api';

async function testWhopSDKLibrary() {
  console.log('🔍 Testing Whop SDK Library');
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
    
    // Test different SDK methods
    const sdkTests = [
      {
        name: 'Get Current User',
        test: async () => {
          return await whopSdk.users.getCurrentUser();
        }
      },
      {
        name: 'List Experiences',
        test: async () => {
          return await whopSdk.experiences.listExperiences();
        }
      },
      {
        name: 'List Access Passes for Experience',
        test: async () => {
          return await whopSdk.experiences.listAccessPassesForExperience({
            experienceId: 'exp_u2Z4n51MqBdr0X'
          });
        }
      },
      {
        name: 'Get Access Pass by ID',
        test: async () => {
          return await whopSdk.accessPasses.getAccessPass({
            accessPassId: 'prod_VgRKhVC0TQnsE'
          });
        }
      },
      {
        name: 'Check User Access to Experience',
        test: async () => {
          return await whopSdk.access.checkIfUserHasAccessToExperience({
            experienceId: 'exp_u2Z4n51MqBdr0X',
            userId: userId
          });
        }
      },
      {
        name: 'Check User Access to Company',
        test: async () => {
          return await whopSdk.access.checkIfUserHasAccessToCompany({
            companyId: companyId,
            userId: userId
          });
        }
      }
    ];
    
    console.log('\n🧪 Testing SDK Methods:');
    console.log('=' .repeat(60));
    
    let workingMethods = [];
    let failingMethods = [];
    
    for (const test of sdkTests) {
      console.log(`\n🔍 Testing: ${test.name}`);
      
      try {
        const result = await test.test();
        console.log(`   ✅ SUCCESS: ${JSON.stringify(result).substring(0, 200)}...`);
        workingMethods.push({
          name: test.name,
          result: result
        });
        
        // Show specific data for access passes
        if (test.name.includes('Access Pass') && result.accessPass) {
          console.log(`   📊 Access Pass Details:`);
          console.log(`      ID: ${result.accessPass.id}`);
          console.log(`      Title: ${result.accessPass.title}`);
          console.log(`      Route: ${result.accessPass.route}`);
          console.log(`      Company: ${result.accessPass.company?.title}`);
        }
        
        // Show specific data for experiences
        if (test.name.includes('Experiences') && result.experiencesV2?.nodes) {
          console.log(`   📊 Found ${result.experiencesV2.nodes.length} experiences:`);
          result.experiencesV2.nodes.forEach((exp, index) => {
            console.log(`      ${index + 1}. ${exp.name} (${exp.id})`);
          });
        }
        
        // Show access level info
        if (test.name.includes('Access') && result.hasAccess !== undefined) {
          console.log(`   📊 Access Level: ${result.accessLevel} (Has Access: ${result.hasAccess})`);
        }
        
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        failingMethods.push({
          name: test.name,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`✅ Working SDK methods: ${workingMethods.length}`);
    console.log(`❌ Failing SDK methods: ${failingMethods.length}`);
    
    if (workingMethods.length > 0) {
      console.log('\n✅ WORKING SDK METHODS:');
      workingMethods.forEach(method => {
        console.log(`   - ${method.name}`);
      });
      
      // Try to find your specific product
      console.log('\n🔍 Looking for your specific product...');
      for (const method of workingMethods) {
        if (method.name.includes('Access Pass') && method.result?.accessPass) {
          const accessPass = method.result.accessPass;
          console.log(`\n📋 Found Access Pass:`);
          console.log(`   Title: ${accessPass.title}`);
          console.log(`   ID: ${accessPass.id}`);
          console.log(`   Route: ${accessPass.route}`);
          console.log(`   Company: ${accessPass.company?.title}`);
          
          // Check if this matches your target
          if (accessPass.route === 'test-ea-e887' || accessPass.title?.toLowerCase().includes('leadcapture')) {
            console.log(`   🎯 THIS IS YOUR TARGET PRODUCT!`);
            
            // Try to create quick link using SDK
            console.log(`\n🚀 Attempting to create quick link using SDK...`);
            await tryCreateQuickLinkSDK(whopSdk, accessPass.id, 'profit-pulse-test');
          }
        }
      }
    }
    
    if (failingMethods.length > 0) {
      console.log('\n❌ FAILING SDK METHODS:');
      failingMethods.forEach(method => {
        console.log(`   - ${method.name}: ${method.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ SDK initialization failed:', error);
  }
}

async function tryCreateQuickLinkSDK(whopSdk, productId, shortLinkName) {
  console.log(`\n🔗 Creating quick link for product: ${productId}`);
  
  // Try different SDK methods for quick link creation
  const quickLinkTests = [
    {
      name: 'Plans Create Quick Link',
      test: async () => {
        return await whopSdk.plans.createQuickLink({
          planId: productId,
          shortLink: shortLinkName,
          redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
        });
      }
    },
    {
      name: 'Access Pass Create Quick Link',
      test: async () => {
        return await whopSdk.accessPasses.createQuickLink({
          accessPassId: productId,
          shortLink: shortLinkName,
          redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
        });
      }
    }
  ];
  
  for (const test of quickLinkTests) {
    console.log(`\n🧪 Trying: ${test.name}`);
    
    try {
      const result = await test.test();
      console.log(`   ✅ SUCCESS! Quick link created:`);
      console.log(`      Response: ${JSON.stringify(result, null, 2)}`);
      return;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ All SDK quick link creation attempts failed');
}

// Run the test
testWhopSDKLibrary().then(() => {
  console.log('\n✅ SDK Library Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ SDK Library Test failed:', error);
  process.exit(1);
});

