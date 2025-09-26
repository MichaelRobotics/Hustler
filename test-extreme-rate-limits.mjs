#!/usr/bin/env node

/**
 * Extreme Rate Limiting Test
 * 
 * This test makes extreme numbers of requests to find the actual rate limits
 * Tests various scenarios to understand Whop's rate limiting behavior
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

async function testExtremeRateLimits() {
  console.log('🚀 Extreme Rate Limiting Test');
  console.log('=' .repeat(50));
  
  // Initialize SDK
  const whopSdk = WhopServerSdk({
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    appApiKey: process.env.WHOP_API_KEY,
    onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
    companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  });
  
  console.log('✅ SDK initialized');
  
  // Test 1: Make 200 rapid requests to find the actual limit
  console.log('\n⚡ Test 1: 200 Rapid Requests');
  console.log('-'.repeat(40));
  
  const rapidRequests = [];
  const requestCount = 200;
  
  console.log(`Making ${requestCount} rapid requests to find actual rate limits...`);
  
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
  
  // Test 2: Test with different time windows
  console.log('\n⏱️  Test 2: Time Window Analysis');
  console.log('-'.repeat(40));
  
  console.log('Testing 5-second bursts...');
  
  for (let burst = 0; burst < 5; burst++) {
    console.log(`\nBurst ${burst + 1}: Making 30 requests in 5 seconds`);
    
    const burstRequests = [];
    for (let i = 0; i < 30; i++) {
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
    
    // Wait 2 seconds between bursts
    if (burst < 4) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Test 3: Test with different API endpoints to see if limits are per-endpoint
  console.log('\n🔍 Test 3: Per-Endpoint Rate Limits');
  console.log('-'.repeat(40));
  
  const endpointTests = [
    { name: 'Users', fn: () => whopSdk.users.getCurrentUser() },
    { name: 'Companies', fn: () => whopSdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }) },
    { name: 'Access Check', fn: () => whopSdk.access.checkIfUserHasAccessToCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID, userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID }) }
  ];
  
  for (const test of endpointTests) {
    console.log(`\nTesting ${test.name} endpoint with 50 requests:`);
    
    const endpointRequests = [];
    for (let i = 0; i < 50; i++) {
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
  
  // Test 4: Test with different user contexts
  console.log('\n👤 Test 4: Different User Contexts');
  console.log('-'.repeat(40));
  
  console.log('Testing with different user contexts...');
  
  const userContextTests = [
    { name: 'Default User', sdk: whopSdk },
    { name: 'With User Context', sdk: whopSdk.withUser(process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID) },
    { name: 'With Company Context', sdk: whopSdk.withCompany(process.env.NEXT_PUBLIC_WHOP_COMPANY_ID) }
  ];
  
  for (const test of userContextTests) {
    console.log(`\nTesting ${test.name}:`);
    
    const contextRequests = [];
    for (let i = 0; i < 30; i++) {
      contextRequests.push(
        test.sdk.users.getCurrentUser().then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const contextResults = await Promise.allSettled(contextRequests);
    
    let contextSuccessCount = 0;
    let contextRateLimitedCount = 0;
    let contextErrorCount = 0;
    
    contextResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          contextSuccessCount++;
        } else {
          if (data.error.includes('rate limited') || data.error.includes('429')) {
            contextRateLimitedCount++;
          } else {
            contextErrorCount++;
          }
        }
      } else {
        contextErrorCount++;
      }
    });
    
    console.log(`   ✅ Successful: ${contextSuccessCount}`);
    console.log(`   🚫 Rate Limited: ${contextRateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${contextErrorCount}`);
  }
  
  // Test 5: Test with different request patterns
  console.log('\n🔄 Test 5: Different Request Patterns');
  console.log('-'.repeat(40));
  
  console.log('Testing sequential vs concurrent requests...');
  
  // Sequential requests
  console.log('\nSequential requests (30 requests, 100ms delay):');
  let sequentialSuccessCount = 0;
  let sequentialRateLimitedCount = 0;
  let sequentialErrorCount = 0;
  
  for (let i = 0; i < 30; i++) {
    try {
      const result = await whopSdk.users.getCurrentUser();
      sequentialSuccessCount++;
    } catch (error) {
      if (error.message.includes('rate limited') || error.message.includes('429')) {
        sequentialRateLimitedCount++;
      } else {
        sequentialErrorCount++;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`   ✅ Successful: ${sequentialSuccessCount}`);
  console.log(`   🚫 Rate Limited: ${sequentialRateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${sequentialErrorCount}`);
  
  // Concurrent requests
  console.log('\nConcurrent requests (30 requests, no delay):');
  const concurrentRequests = [];
  for (let i = 0; i < 30; i++) {
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
  
  console.log(`   ✅ Successful: ${concurrentSuccessCount}`);
  console.log(`   🚫 Rate Limited: ${concurrentRateLimitedCount}`);
  console.log(`   ❌ Other Errors: ${concurrentErrorCount}`);
  
  // Summary
  console.log('\n📋 EXTREME RATE LIMITING ANALYSIS');
  console.log('=' .repeat(50));
  console.log('Rate limiting behavior observed:');
  console.log(`   Rapid requests (200): ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Time window bursts: ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Per-endpoint limits: ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   User context limits: ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  console.log(`   Sequential vs concurrent: ${rateLimitedCount > 0 ? 'Rate limited' : 'No rate limiting'}`);
  
  if (rateLimitedCount === 0) {
    console.log('\n🤔 No rate limiting detected even with extreme requests.');
    console.log('Possible explanations:');
    console.log('   • Rate limits are much higher than documented (maybe 1000+ requests)');
    console.log('   • Rate limits are based on different factors (IP, user, company)');
    console.log('   • Rate limits are per-API-key rather than per-app');
    console.log('   • Rate limits have different time windows (maybe 1 minute instead of 10 seconds)');
    console.log('   • Rate limits are only enforced in production, not development');
    console.log('   • Rate limits are based on request complexity, not just count');
  }
  
  console.log('\n💡 Recommendations:');
  console.log('   • Monitor your actual usage patterns in production');
  console.log('   • Implement reasonable delays between requests (100-500ms)');
  console.log('   • Cache frequently accessed data');
  console.log('   • Use webhooks for real-time updates');
  console.log('   • Implement exponential backoff for error handling');
  
  console.log('\n✅ Extreme rate limiting test completed');
}

// Run the test
testExtremeRateLimits().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
