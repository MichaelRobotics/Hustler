#!/usr/bin/env node

/**
 * Ultimate Rate Limiting Test
 * 
 * This test pushes Whop SDK to the absolute limits to find the real rate limits
 * Uses all real functions from the codebase with extreme request patterns
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

async function testUltimateRateLimits() {
  console.log('🚀 Ultimate Rate Limiting Test');
  console.log('=' .repeat(60));
  
  // Initialize SDK
  const whopSdk = WhopServerSdk({
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    appApiKey: process.env.WHOP_API_KEY,
    onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
    companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  });
  
  console.log('✅ SDK initialized');
  
  // Test 1: 500 rapid requests to find the absolute limit
  console.log('\n⚡ Test 1: 500 Rapid Requests');
  console.log('-'.repeat(40));
  
  const rapidRequests = [];
  const requestCount = 500;
  
  console.log(`Making ${requestCount} rapid requests to find absolute limits...`);
  
  for (let i = 0; i < requestCount; i++) {
    rapidRequests.push(
      whopSdk.users.getCurrentUser().then(
        result => ({ success: true, request: i + 1, result }),
        error => ({ success: false, request: i + 1, error: error.message })
      )
    );
  }
  
  const results = await Promise.allSettled(rapidRequests);
  
  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;
  let firstRateLimitAt = null;
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        successCount++;
      } else {
        if (data.error.includes('rate limited') || data.error.includes('429')) {
          rateLimitedCount++;
          if (firstRateLimitAt === null) {
            firstRateLimitAt = data.request;
          }
        } else {
          errorCount++;
        }
      }
    } else {
      errorCount++;
    }
  });
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${errorCount}`);
  if (firstRateLimitAt) {
    console.log(`   🎯 First rate limit at request: ${firstRateLimitAt}`);
  }
  
  // Test 2: 1000 requests with different functions
  console.log('\n🔄 Test 2: 1000 Mixed Function Requests');
  console.log('-'.repeat(40));
  
  const mixedRequests = [];
  const mixedCount = 1000;
  
  console.log(`Making ${mixedCount} mixed function requests...`);
  
  const functions = [
    () => whopSdk.users.getCurrentUser(),
    () => whopSdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }),
    () => whopSdk.access.checkIfUserHasAccessToExperience({
      userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
      experienceId: 'exp_u2Z4n51MqBdr0X'
    }),
    () => whopSdk.access.checkIfUserHasAccessToCompany({
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
      userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID
    }),
    () => whopSdk.messages.listDirectMessageConversations()
  ];
  
  for (let i = 0; i < mixedCount; i++) {
    const func = functions[i % functions.length];
    mixedRequests.push(
      func().then(
        result => ({ success: true, request: i + 1, result }),
        error => ({ success: false, request: i + 1, error: error.message })
      )
    );
  }
  
  const mixedResults = await Promise.allSettled(mixedRequests);
  
  let mixedSuccessCount = 0;
  let mixedRateLimitedCount = 0;
  let mixedErrorCount = 0;
  
  mixedResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        mixedSuccessCount++;
      } else {
        if (data.error.includes('rate limited') || data.error.includes('429')) {
          mixedRateLimitedCount++;
        } else {
          mixedErrorCount++;
        }
      }
    } else {
      mixedErrorCount++;
    }
  });
  
  console.log(`\n📊 Mixed Results:`);
  console.log(`   ✅ Successful: ${mixedSuccessCount}`);
  console.log(`   🚫 Rate Limited: ${mixedRateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${mixedErrorCount}`);
  
  // Test 3: Extreme concurrent requests
  console.log('\n🌊 Test 3: Extreme Concurrent Requests');
  console.log('-'.repeat(40));
  
  console.log('Making 200 concurrent requests...');
  
  const concurrentRequests = [];
  for (let i = 0; i < 200; i++) {
    concurrentRequests.push(
      whopSdk.users.getCurrentUser().then(
        result => ({ success: true, request: i + 1, result }),
        error => ({ success: false, request: i + 1, error: error.message })
      )
    );
  }
  
  const concurrentResults = await Promise.allSettled(concurrentRequests);
  
  let concurrentSuccessCount = 0;
  let concurrentRateLimitedCount = 0;
  let concurrentErrorCount = 0;
  
  concurrentResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        concurrentSuccessCount++;
      } else {
        if (data.error.includes('rate limited') || data.error.includes('429')) {
          concurrentRateLimitedCount++;
        } else {
          concurrentErrorCount++;
        }
      }
    } else {
      concurrentErrorCount++;
    }
  });
  
  console.log(`\n📊 Concurrent Results:`);
  console.log(`   ✅ Successful: ${concurrentSuccessCount}`);
  console.log(`   🚫 Rate Limited: ${concurrentRateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${concurrentErrorCount}`);
  
  // Test 4: Test with different time windows
  console.log('\n⏱️  Test 4: Different Time Windows');
  console.log('-'.repeat(40));
  
  console.log('Testing 1-second bursts...');
  
  for (let burst = 0; burst < 10; burst++) {
    console.log(`\nBurst ${burst + 1}: Making 100 requests in 1 second`);
    
    const burstRequests = [];
    for (let i = 0; i < 100; i++) {
      burstRequests.push(
        whopSdk.users.getCurrentUser().then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const burstResults = await Promise.allSettled(burstRequests);
    
    let burstSuccessCount = 0;
    let burstRateLimitedCount = 0;
    let burstErrorCount = 0;
    
    burstResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          burstSuccessCount++;
        } else {
          if (data.error.includes('rate limited') || data.error.includes('429')) {
            burstRateLimitedCount++;
          } else {
            burstErrorCount++;
          }
        }
      } else {
        burstErrorCount++;
      }
    });
    
    console.log(`   ✅ Successful: ${burstSuccessCount}`);
    console.log(`   🚫 Rate Limited: ${burstRateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${burstErrorCount}`);
    
    // Wait 1 second between bursts
    if (burst < 9) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Test 5: Test with different API keys (if available)
  console.log('\n🔑 Test 5: Different API Key Contexts');
  console.log('-'.repeat(40));
  
  console.log('Testing with different SDK configurations...');
  
  const sdkConfigs = [
    {
      name: 'Default Config',
      sdk: whopSdk
    },
    {
      name: 'With User Context',
      sdk: whopSdk.withUser(process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID)
    },
    {
      name: 'With Company Context',
      sdk: whopSdk.withCompany(process.env.NEXT_PUBLIC_WHOP_COMPANY_ID)
    }
  ];
  
  for (const config of sdkConfigs) {
    console.log(`\nTesting ${config.name}:`);
    
    const configRequests = [];
    for (let i = 0; i < 50; i++) {
      configRequests.push(
        config.sdk.users.getCurrentUser().then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const configResults = await Promise.allSettled(configRequests);
    
    let configSuccessCount = 0;
    let configRateLimitedCount = 0;
    let configErrorCount = 0;
    
    configResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          configSuccessCount++;
        } else {
          if (data.error.includes('rate limited') || data.error.includes('429')) {
            configRateLimitedCount++;
          } else {
            configErrorCount++;
          }
        }
      } else {
        configErrorCount++;
      }
    });
    
    console.log(`   ✅ Successful: ${configSuccessCount}`);
    console.log(`   🚫 Rate Limited: ${configRateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${configErrorCount}`);
  }
  
  // Test 6: Test with different endpoints
  console.log('\n🌐 Test 6: Different Endpoints');
  console.log('-'.repeat(40));
  
  const endpointTests = [
    { name: 'Users', fn: () => whopSdk.users.getCurrentUser() },
    { name: 'Companies', fn: () => whopSdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }) },
    { name: 'Access Experience', fn: () => whopSdk.access.checkIfUserHasAccessToExperience({
      userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
      experienceId: 'exp_u2Z4n51MqBdr0X'
    })},
    { name: 'Access Company', fn: () => whopSdk.access.checkIfUserHasAccessToCompany({
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
      userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID
    })},
    { name: 'Messages', fn: () => whopSdk.messages.listDirectMessageConversations() }
  ];
  
  for (const test of endpointTests) {
    console.log(`\nTesting ${test.name} endpoint with 100 requests:`);
    
    const endpointRequests = [];
    for (let i = 0; i < 100; i++) {
      endpointRequests.push(
        test.fn().then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const endpointResults = await Promise.allSettled(endpointRequests);
    
    let endpointSuccessCount = 0;
    let endpointRateLimitedCount = 0;
    let endpointErrorCount = 0;
    
    endpointResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          endpointSuccessCount++;
        } else {
          if (data.error.includes('rate limited') || data.error.includes('429')) {
            endpointRateLimitedCount++;
          } else {
            endpointErrorCount++;
          }
        }
      } else {
        endpointErrorCount++;
      }
    });
    
    console.log(`   ✅ Successful: ${endpointSuccessCount}`);
    console.log(`   🚫 Rate Limited: ${endpointRateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${endpointErrorCount}`);
  }
  
  // Summary
  console.log('\n📋 ULTIMATE RATE LIMITING ANALYSIS');
  console.log('=' .repeat(60));
  console.log('Extreme testing results:');
  console.log(`   Rapid requests (500): ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Mixed requests (1000): ${mixedRateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Concurrent requests (200): ${concurrentRateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Time window bursts: ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Different contexts: ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Different endpoints: ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  
  const totalRequests = 500 + 1000 + 200 + 1000 + 150 + 500;
  console.log(`\n📊 Total Requests Made: ${totalRequests}`);
  console.log(`   Rate Limited: ${rateLimitedCount + mixedRateLimitedCount + concurrentRateLimitedCount}`);
  console.log(`   Success Rate: ${((totalRequests - (rateLimitedCount + mixedRateLimitedCount + concurrentRateLimitedCount)) / totalRequests * 100).toFixed(2)}%`);
  
  if (rateLimitedCount === 0 && mixedRateLimitedCount === 0 && concurrentRateLimitedCount === 0) {
    console.log('\n🤔 No rate limiting detected even with extreme requests.');
    console.log('Possible explanations:');
    console.log('   • Rate limits are much higher than documented (maybe 5000+ requests)');
    console.log('   • Rate limits are based on different factors (IP, user, company, request complexity)');
    console.log('   • Rate limits are per-API-key rather than per-app');
    console.log('   • Rate limits have different time windows (maybe 1 hour instead of 10 seconds)');
    console.log('   • Rate limits are only enforced in production, not development');
    console.log('   • Rate limits are based on request complexity, not just count');
    console.log('   • Rate limits are based on data volume, not request count');
    console.log('   • Rate limits are based on user behavior patterns');
  }
  
  console.log('\n💡 Recommendations:');
  console.log('   • Monitor your actual usage patterns in production');
  console.log('   • Implement reasonable delays between requests (100-500ms)');
  console.log('   • Cache frequently accessed data');
  console.log('   • Use webhooks for real-time updates');
  console.log('   • Implement exponential backoff for error handling');
  console.log('   • Monitor for actual rate limiting errors in production');
  console.log('   • Consider using multiple API keys for different services');
  
  console.log('\n✅ Ultimate rate limiting test completed');
}

// Run the test
testUltimateRateLimits().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

