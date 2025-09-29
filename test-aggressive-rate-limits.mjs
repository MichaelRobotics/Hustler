#!/usr/bin/env node

/**
 * Aggressive Rate Limiting Test
 * 
 * This test makes many more requests to actually trigger rate limiting
 * Tests both sequential and concurrent approaches
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

async function testAggressiveRateLimits() {
  console.log('🚀 Aggressive Rate Limiting Test');
  console.log('=' .repeat(50));
  
  // Initialize SDK
  const whopSdk = WhopServerSdk({
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    appApiKey: process.env.WHOP_API_KEY,
    onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
    companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  });
  
  console.log('✅ SDK initialized');
  
  // Test 1: Make 50 rapid requests to definitely trigger rate limiting
  console.log('\n⚡ Test 1: 50 Rapid Requests');
  console.log('-'.repeat(40));
  
  const rapidRequests = [];
  const requestCount = 50;
  
  console.log(`Making ${requestCount} rapid requests...`);
  
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
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        successCount++;
        console.log(`✅ Request ${data.request}: Success`);
      } else {
        if (data.error.includes('rate limited') || data.error.includes('429')) {
          rateLimitedCount++;
          console.log(`🚫 Request ${data.request}: Rate Limited`);
        } else {
          errorCount++;
          console.log(`❌ Request ${data.request}: ${data.error}`);
        }
      }
    } else {
      errorCount++;
      console.log(`💥 Request ${index + 1}: Promise rejected - ${result.reason}`);
    }
  });
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${errorCount}`);
  
  // Test 2: Make 100 requests with small delays
  console.log('\n⏱️  Test 2: 100 Requests with Small Delays');
  console.log('-'.repeat(40));
  
  const delayedRequests = [];
  const delayedCount = 100;
  
  console.log(`Making ${delayedCount} requests with 50ms delays...`);
  
  for (let i = 0; i < delayedCount; i++) {
    delayedRequests.push(
      whopSdk.users.getCurrentUser().then(
        result => ({ success: true, request: i + 1, result }),
        error => ({ success: false, request: i + 1, error: error.message })
      )
    );
    
    // Small delay between requests
    if (i < delayedCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  const delayedResults = await Promise.allSettled(delayedRequests);
  
  let delayedSuccessCount = 0;
  let delayedRateLimitedCount = 0;
  let delayedErrorCount = 0;
  
  delayedResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        delayedSuccessCount++;
      } else {
        if (data.error.includes('rate limited') || data.error.includes('429')) {
          delayedRateLimitedCount++;
        } else {
          delayedErrorCount++;
        }
      }
    } else {
      delayedErrorCount++;
    }
  });
  
  console.log(`\n📊 Delayed Results:`);
  console.log(`   ✅ Successful: ${delayedSuccessCount}`);
  console.log(`   🚫 Rate Limited: ${delayedRateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${delayedErrorCount}`);
  
  // Test 3: Test different endpoints
  console.log('\n🔍 Test 3: Different Endpoints');
  console.log('-'.repeat(40));
  
  const endpointTests = [
    { name: 'Users', fn: () => whopSdk.users.getCurrentUser() },
    { name: 'Companies', fn: () => whopSdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }) },
    { name: 'Access Check', fn: () => whopSdk.access.checkIfUserHasAccessToCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID, userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID }) }
  ];
  
  for (const test of endpointTests) {
    console.log(`\nTesting ${test.name} endpoint:`);
    
    const endpointRequests = [];
    for (let i = 0; i < 30; i++) {
      endpointRequests.push(
        test.fn().then(
          result => ({ success: true, request: i + 1 }),
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
  
  // Test 4: Check if rate limits are per-endpoint or global
  console.log('\n🌐 Test 4: Global vs Per-Endpoint Rate Limits');
  console.log('-'.repeat(40));
  
  console.log('Making mixed requests to different endpoints...');
  
  const mixedRequests = [];
  for (let i = 0; i < 30; i++) {
    if (i % 3 === 0) {
      mixedRequests.push(whopSdk.users.getCurrentUser());
    } else if (i % 3 === 1) {
      mixedRequests.push(whopSdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }));
    } else {
      mixedRequests.push(whopSdk.access.checkIfUserHasAccessToCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID, userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID }));
    }
  }
  
  const mixedResults = await Promise.allSettled(mixedRequests);
  
  let mixedSuccessCount = 0;
  let mixedRateLimitedCount = 0;
  let mixedErrorCount = 0;
  
  mixedResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      mixedSuccessCount++;
    } else {
      if (result.reason.message.includes('rate limited') || result.reason.message.includes('429')) {
        mixedRateLimitedCount++;
      } else {
        mixedErrorCount++;
      }
    }
  });
  
  console.log(`\n📊 Mixed Endpoint Results:`);
  console.log(`   ✅ Successful: ${mixedSuccessCount}`);
  console.log(`   🚫 Rate Limited: ${mixedRateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${mixedErrorCount}`);
  
  // Summary
  console.log('\n📋 SUMMARY');
  console.log('=' .repeat(50));
  console.log('Rate limiting behavior observed:');
  console.log(`   Rapid requests (50): ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Delayed requests (100): ${delayedRateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Mixed endpoints (30): ${mixedRateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  
  if (rateLimitedCount === 0 && delayedRateLimitedCount === 0 && mixedRateLimitedCount === 0) {
    console.log('\n🤔 No rate limiting detected. Possible reasons:');
    console.log('   • Rate limits may be higher than documented');
    console.log('   • Rate limits may be per-API-key rather than per-app');
    console.log('   • Rate limits may have different time windows');
    console.log('   • Rate limits may be based on different factors');
  }
  
  console.log('\n✅ Aggressive rate limiting test completed');
}

// Run the test
testAggressiveRateLimits().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});



