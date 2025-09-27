#!/usr/bin/env node

/**
 * Simple Whop SDK Rate Limiting Test
 * 
 * Focused test to specifically trigger and observe rate limiting behavior
 * Tests the documented limits:
 * - v5 endpoints: 20 requests per 10 seconds
 * - v2 endpoints: 100 requests per 10 seconds
 * - 60-second cooldown when limit exceeded
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

async function testRateLimits() {
  console.log('🚀 Whop SDK Rate Limiting Test');
  console.log('=' .repeat(50));
  
  // Initialize SDK
  const whopSdk = WhopServerSdk({
    appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
    appApiKey: process.env.WHOP_API_KEY,
    onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
    companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
  });
  
  console.log('✅ SDK initialized');
  
  // Test 1: Normal requests (should work)
  console.log('\n📋 Test 1: Normal API calls (within limits)');
  console.log('-'.repeat(40));
  
  const normalTests = [
    { name: 'Get Current User', fn: () => whopSdk.users.getCurrentUser() },
    { name: 'List Experiences', fn: () => whopSdk.experiences.listExperiences() },
    { name: 'Get Company', fn: () => whopSdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }) }
  ];
  
  for (const test of normalTests) {
    try {
      const start = Date.now();
      const result = await test.fn();
      const duration = Date.now() - start;
      console.log(`✅ ${test.name}: ${duration}ms`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  // Test 2: Rapid requests to trigger rate limiting
  console.log('\n⚡ Test 2: Rapid requests to trigger rate limiting');
  console.log('-'.repeat(40));
  console.log('Making 25 rapid requests (exceeds v5 limit of 20)...');
  
  const rapidRequests = [];
  const requestCount = 25;
  
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
  
  console.log(`\n📊 Results Summary:`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Rate Limited: ${rateLimitedCount}`);
  console.log(`   Other Errors: ${errorCount}`);
  
  // Test 3: Wait and retry after rate limiting
  if (rateLimitedCount > 0) {
    console.log('\n⏳ Test 3: Waiting for rate limit cooldown...');
    console.log('-'.repeat(40));
    console.log('Waiting 65 seconds for rate limit to reset...');
    
    await new Promise(resolve => setTimeout(resolve, 65000));
    
    console.log('Testing if rate limits have been lifted...');
    try {
      const start = Date.now();
      const result = await whopSdk.users.getCurrentUser();
      const duration = Date.now() - start;
      console.log(`✅ Recovery test successful: ${duration}ms`);
    } catch (error) {
      if (error.message.includes('rate limited')) {
        console.log(`🚫 Still rate limited: ${error.message}`);
      } else {
        console.log(`❌ Recovery failed: ${error.message}`);
      }
    }
  }
  
  // Test 4: Test different endpoint types
  console.log('\n🔍 Test 4: Testing different endpoint types');
  console.log('-'.repeat(40));
  
  const endpointTests = [
    { name: 'Users (v5)', fn: () => whopSdk.users.getCurrentUser(), expectedLimit: 20 },
    { name: 'Experiences (v5)', fn: () => whopSdk.experiences.listExperiences(), expectedLimit: 20 },
    { name: 'Companies (v5)', fn: () => whopSdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }), expectedLimit: 20 }
  ];
  
  for (const test of endpointTests) {
    console.log(`\nTesting ${test.name} (limit: ${test.expectedLimit}/10s):`);
    
    // Make a few requests to test the endpoint
    for (let i = 0; i < 3; i++) {
      try {
        const start = Date.now();
        await test.fn();
        const duration = Date.now() - start;
        console.log(`  Request ${i + 1}: ${duration}ms`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      } catch (error) {
        console.log(`  Request ${i + 1}: ${error.message}`);
      }
    }
  }
  
  console.log('\n📋 Rate Limiting Documentation:');
  console.log('=' .repeat(50));
  console.log('• v5 endpoints: 20 requests per 10 seconds');
  console.log('• v2 endpoints: 100 requests per 10 seconds');
  console.log('• Cooldown: 60 seconds when limit exceeded');
  console.log('• Error response: 429 "You are being rate limited"');
  
  console.log('\n💡 Best Practices:');
  console.log('• Implement exponential backoff');
  console.log('• Cache frequently accessed data');
  console.log('• Batch operations when possible');
  console.log('• Monitor rate limit headers');
  console.log('• Use webhooks for real-time updates');
  
  console.log('\n✅ Rate limiting test completed');
}

// Run the test
testRateLimits().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

