#!/usr/bin/env node

/**
 * Comprehensive Whop SDK Rate Limiting Test
 * 
 * This test function calls multiple Whop SDK functions to:
 * 1. Test rate limiting behavior
 * 2. Monitor response times and error handling
 * 3. Check both v2 and v5 endpoint limits
 * 4. Document rate limiting patterns
 * 
 * Rate Limits (from Whop docs):
 * - /v5/* endpoints: 20 requests every 10 seconds
 * - /v2/* endpoints: 100 requests every 10 seconds
 * - 60-second cooldown when limit is hit
 * - Returns 429 status with "You are being rate limited" message
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Import the Whop SDK
import { WhopServerSdk } from '@whop/api';

// Rate limiting test configuration
const RATE_LIMIT_CONFIG = {
  v5: {
    limit: 20,
    window: 10000, // 10 seconds
    cooldown: 60000 // 60 seconds
  },
  v2: {
    limit: 100,
    window: 10000, // 10 seconds
    cooldown: 60000 // 60 seconds
  }
};

class RateLimitTester {
  constructor() {
    this.apiKey = process.env.WHOP_API_KEY;
    this.companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    this.appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
    this.userId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
    
    this.whopSdk = null;
    this.testResults = [];
    this.rateLimitHits = [];
    this.requestTimings = [];
  }

  async initialize() {
    console.log('🔍 Initializing Whop SDK Rate Limiting Test');
    console.log('=' .repeat(80));
    
    console.log('🔑 Environment Variables:');
    console.log(`   API Key: ${this.apiKey ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Company ID: ${this.companyId}`);
    console.log(`   App ID: ${this.appId}`);
    console.log(`   User ID: ${this.userId}`);
    
    if (!this.apiKey || !this.companyId || !this.userId) {
      throw new Error('Missing required environment variables');
    }
    
    this.whopSdk = WhopServerSdk({
      appId: this.appId,
      appApiKey: this.apiKey,
      onBehalfOfUserId: this.userId,
      companyId: this.companyId,
    });
    
    console.log('✅ SDK initialized successfully\n');
  }

  async testSingleFunction(functionName, testFunction, expectedEndpoint = 'v5') {
    const startTime = Date.now();
    const requestId = `${functionName}_${startTime}`;
    
    try {
      console.log(`🧪 Testing: ${functionName} (${expectedEndpoint} endpoint)`);
      
      const result = await testFunction();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.requestTimings.push({
        function: functionName,
        endpoint: expectedEndpoint,
        duration,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      console.log(`   ✅ SUCCESS (${duration}ms): ${JSON.stringify(result).substring(0, 100)}...`);
      
      this.testResults.push({
        function: functionName,
        endpoint: expectedEndpoint,
        success: true,
        duration,
        result: result,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, result, duration };
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.requestTimings.push({
        function: functionName,
        endpoint: expectedEndpoint,
        duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Check if this is a rate limit error
      const isRateLimit = error.message.includes('rate limited') || 
                         error.message.includes('429') ||
                         error.message.includes('Too Many Requests');
      
      if (isRateLimit) {
        this.rateLimitHits.push({
          function: functionName,
          endpoint: expectedEndpoint,
          timestamp: new Date().toISOString(),
          error: error.message
        });
        console.log(`   🚫 RATE LIMITED (${duration}ms): ${error.message}`);
      } else {
        console.log(`   ❌ FAILED (${duration}ms): ${error.message}`);
      }
      
      this.testResults.push({
        function: functionName,
        endpoint: expectedEndpoint,
        success: false,
        duration,
        error: error.message,
        isRateLimit,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, error: error.message, duration, isRateLimit };
    }
  }

  async testMultipleFunctions() {
    console.log('🚀 Testing Multiple SDK Functions for Rate Limiting');
    console.log('=' .repeat(80));
    
    // Define test functions with their expected endpoints
    const testFunctions = [
      // v5 endpoint tests (20 requests per 10 seconds)
      {
        name: 'Get Current User',
        function: () => this.whopSdk.users.getCurrentUser(),
        endpoint: 'v5'
      },
      {
        name: 'List Experiences',
        function: () => this.whopSdk.experiences.listExperiences(),
        endpoint: 'v5'
      },
      {
        name: 'List Access Passes for Experience',
        function: () => this.whopSdk.experiences.listAccessPassesForExperience({
          experienceId: 'exp_u2Z4n51MqBdr0X'
        }),
        endpoint: 'v5'
      },
      {
        name: 'Get Access Pass by ID',
        function: () => this.whopSdk.accessPasses.getAccessPass({
          accessPassId: 'prod_VgRKhVC0TQnsE'
        }),
        endpoint: 'v5'
      },
      {
        name: 'Check User Access to Experience',
        function: () => this.whopSdk.access.checkIfUserHasAccessToExperience({
          experienceId: 'exp_u2Z4n51MqBdr0X',
          userId: this.userId
        }),
        endpoint: 'v5'
      },
      {
        name: 'Check User Access to Company',
        function: () => this.whopSdk.access.checkIfUserHasAccessToCompany({
          companyId: this.companyId,
          userId: this.userId
        }),
        endpoint: 'v5'
      },
      {
        name: 'List Company Members',
        function: () => this.whopSdk.companies.listCompanyMembers({
          companyId: this.companyId
        }),
        endpoint: 'v5'
      },
      {
        name: 'Get Company Details',
        function: () => this.whopSdk.companies.getCompany({
          companyId: this.companyId
        }),
        endpoint: 'v5'
      }
    ];

    // Test functions sequentially to monitor rate limiting
    for (let i = 0; i < testFunctions.length; i++) {
      const test = testFunctions[i];
      await this.testSingleFunction(test.name, test.function, test.endpoint);
      
      // Add small delay between requests to avoid overwhelming
      if (i < testFunctions.length - 1) {
        await this.sleep(100); // 100ms delay
      }
    }
  }

  async testRapidRequests() {
    console.log('\n⚡ Testing Rapid Requests to Trigger Rate Limiting');
    console.log('=' .repeat(80));
    
    // Make rapid requests to trigger rate limiting
    const rapidRequests = [];
    const requestCount = 25; // More than v5 limit of 20
    
    console.log(`🚀 Making ${requestCount} rapid requests to trigger rate limiting...`);
    
    for (let i = 0; i < requestCount; i++) {
      rapidRequests.push(
        this.testSingleFunction(
          `Rapid Request ${i + 1}`,
          () => this.whopSdk.users.getCurrentUser(),
          'v5'
        )
      );
    }
    
    // Execute all requests
    const results = await Promise.allSettled(rapidRequests);
    
    console.log(`\n📊 Rapid Request Results:`);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const rateLimited = results.filter(r => r.status === 'fulfilled' && r.value.isRateLimit).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success && !r.value.isRateLimit)).length;
    
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   🚫 Rate Limited: ${rateLimited}`);
    console.log(`   ❌ Failed: ${failed}`);
  }

  async testRateLimitRecovery() {
    console.log('\n🔄 Testing Rate Limit Recovery');
    console.log('=' .repeat(80));
    
    if (this.rateLimitHits.length === 0) {
      console.log('ℹ️  No rate limits hit during testing, skipping recovery test');
      return;
    }
    
    console.log('⏳ Waiting 65 seconds for rate limit cooldown...');
    await this.sleep(65000);
    
    console.log('🧪 Testing if rate limits have been lifted...');
    
    const recoveryTest = await this.testSingleFunction(
      'Rate Limit Recovery Test',
      () => this.whopSdk.users.getCurrentUser(),
      'v5'
    );
    
    if (recoveryTest.success) {
      console.log('✅ Rate limit recovery successful!');
    } else if (recoveryTest.isRateLimit) {
      console.log('🚫 Still rate limited, may need more time');
    } else {
      console.log('❌ Recovery test failed for other reasons');
    }
  }

  generateReport() {
    console.log('\n📊 RATE LIMITING TEST REPORT');
    console.log('=' .repeat(80));
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const rateLimitedTests = this.testResults.filter(r => r.isRateLimit).length;
    const failedTests = this.testResults.filter(r => !r.success && !r.isRateLimit).length;
    
    console.log(`📈 Test Statistics:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   Rate Limited: ${rateLimitedTests} (${((rateLimitedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (this.rateLimitHits.length > 0) {
      console.log(`\n🚫 Rate Limit Events:`);
      this.rateLimitHits.forEach((hit, index) => {
        console.log(`   ${index + 1}. ${hit.function} (${hit.endpoint}) - ${hit.timestamp}`);
        console.log(`      Error: ${hit.error}`);
      });
    }
    
    // Calculate average response times
    const avgResponseTime = this.requestTimings.reduce((sum, timing) => sum + timing.duration, 0) / this.requestTimings.length;
    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Fastest Response: ${Math.min(...this.requestTimings.map(t => t.duration))}ms`);
    console.log(`   Slowest Response: ${Math.max(...this.requestTimings.map(t => t.duration))}ms`);
    
    // Rate limiting analysis
    console.log(`\n🔍 Rate Limiting Analysis:`);
    console.log(`   v5 Endpoint Limit: ${RATE_LIMIT_CONFIG.v5.limit} requests per ${RATE_LIMIT_CONFIG.v5.window/1000} seconds`);
    console.log(`   v2 Endpoint Limit: ${RATE_LIMIT_CONFIG.v2.limit} requests per ${RATE_LIMIT_CONFIG.v2.window/1000} seconds`);
    console.log(`   Cooldown Period: ${RATE_LIMIT_CONFIG.v5.cooldown/1000} seconds`);
    
    if (rateLimitedTests > 0) {
      console.log(`\n⚠️  Rate limiting was triggered! This is expected behavior.`);
      console.log(`   The system correctly enforced the rate limits as documented.`);
    } else {
      console.log(`\n✅ No rate limiting was triggered during this test.`);
      console.log(`   This could mean the requests were within limits or the test didn't make enough requests.`);
    }
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    console.log(`   1. Implement exponential backoff for rate-limited requests`);
    console.log(`   2. Cache frequently accessed data to reduce API calls`);
    console.log(`   3. Batch multiple operations when possible`);
    console.log(`   4. Monitor rate limit headers in production`);
    console.log(`   5. Consider using webhooks for real-time updates instead of polling`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function runRateLimitTest() {
  const tester = new RateLimitTester();
  
  try {
    await tester.initialize();
    await tester.testMultipleFunctions();
    await tester.testRapidRequests();
    await tester.testRateLimitRecovery();
    tester.generateReport();
    
    console.log('\n✅ Rate Limiting Test completed successfully');
    
  } catch (error) {
    console.error('❌ Rate Limiting Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runRateLimitTest().then(() => {
  console.log('\n🎉 All tests completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});



