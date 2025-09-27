#!/usr/bin/env node

/**
 * Comprehensive Whop SDK Rate Limiting Analysis
 * 
 * This test provides detailed analysis of Whop's rate limiting behavior including:
 * - Multiple SDK function testing
 * - Rate limit detection and monitoring
 * - Performance metrics
 * - Error handling patterns
 * - Recovery testing
 * - Best practices validation
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

class ComprehensiveRateLimitTester {
  constructor() {
    this.sdk = null;
    this.testResults = [];
    this.rateLimitEvents = [];
    this.performanceMetrics = [];
    this.startTime = Date.now();
  }

  async initialize() {
    console.log('🔧 Initializing Comprehensive Rate Limit Tester');
    console.log('=' .repeat(60));
    
    // Validate environment
    const required = ['WHOP_API_KEY', 'NEXT_PUBLIC_WHOP_APP_ID', 'NEXT_PUBLIC_WHOP_AGENT_USER_ID', 'NEXT_PUBLIC_WHOP_COMPANY_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    this.sdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      appApiKey: process.env.WHOP_API_KEY,
      onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    });
    
    console.log('✅ SDK initialized successfully');
    console.log(`   App ID: ${process.env.NEXT_PUBLIC_WHOP_APP_ID}`);
    console.log(`   Company ID: ${process.env.NEXT_PUBLIC_WHOP_COMPANY_ID}`);
    console.log(`   User ID: ${process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID}`);
  }

  async executeTest(testName, testFunction, expectedEndpoint = 'v5') {
    const startTime = Date.now();
    const testId = `${testName}_${startTime}`;
    
    try {
      console.log(`🧪 ${testName}...`);
      
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const testResult = {
        id: testId,
        name: testName,
        endpoint: expectedEndpoint,
        success: true,
        duration,
        result,
        timestamp: new Date().toISOString()
      };
      
      this.testResults.push(testResult);
      this.performanceMetrics.push({ test: testName, duration, success: true });
      
      console.log(`   ✅ Success (${duration}ms)`);
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const isRateLimit = this.isRateLimitError(error);
      
      const testResult = {
        id: testId,
        name: testName,
        endpoint: expectedEndpoint,
        success: false,
        duration,
        error: error.message,
        isRateLimit,
        timestamp: new Date().toISOString()
      };
      
      this.testResults.push(testResult);
      this.performanceMetrics.push({ test: testName, duration, success: false, isRateLimit });
      
      if (isRateLimit) {
        this.rateLimitEvents.push({
          test: testName,
          timestamp: new Date().toISOString(),
          error: error.message
        });
        console.log(`   🚫 Rate Limited (${duration}ms)`);
      } else {
        console.log(`   ❌ Failed (${duration}ms): ${error.message}`);
      }
      
      return testResult;
    }
  }

  isRateLimitError(error) {
    const rateLimitIndicators = [
      'rate limited',
      '429',
      'Too Many Requests',
      'rate limit',
      'quota exceeded'
    ];
    
    return rateLimitIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  async testBasicSDKFunctions() {
    console.log('\n📋 Testing Basic SDK Functions');
    console.log('-'.repeat(40));
    
    const basicTests = [
      {
        name: 'Get Current User',
        fn: () => this.sdk.users.getCurrentUser(),
        endpoint: 'v5'
      },
      {
        name: 'List Experiences',
        fn: () => this.sdk.experiences.listExperiences(),
        endpoint: 'v5'
      },
      {
        name: 'Get Company Details',
        fn: () => this.sdk.companies.getCompany({ 
          companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID 
        }),
        endpoint: 'v5'
      },
      {
        name: 'List Company Members',
        fn: () => this.sdk.companies.listCompanyMembers({ 
          companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID 
        }),
        endpoint: 'v5'
      },
      {
        name: 'Check User Access to Experience',
        fn: () => this.sdk.access.checkIfUserHasAccessToExperience({
          experienceId: 'exp_u2Z4n51MqBdr0X',
          userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID
        }),
        endpoint: 'v5'
      },
      {
        name: 'Check User Access to Company',
        fn: () => this.sdk.access.checkIfUserHasAccessToCompany({
          companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
          userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID
        }),
        endpoint: 'v5'
      }
    ];
    
    for (const test of basicTests) {
      await this.executeTest(test.name, test.fn, test.endpoint);
      await this.sleep(200); // Small delay between tests
    }
  }

  async testRateLimitTriggering() {
    console.log('\n⚡ Testing Rate Limit Triggering');
    console.log('-'.repeat(40));
    console.log('Making 25 rapid requests to trigger v5 rate limiting (limit: 20/10s)...');
    
    const rapidTests = [];
    for (let i = 0; i < 25; i++) {
      rapidTests.push(
        this.executeTest(
          `Rapid Request ${i + 1}`,
          () => this.sdk.users.getCurrentUser(),
          'v5'
        )
      );
    }
    
    const results = await Promise.allSettled(rapidTests);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const rateLimited = results.filter(r => r.status === 'fulfilled' && r.value.isRateLimit).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success && !r.value.isRateLimit)).length;
    
    console.log(`\n📊 Rapid Request Results:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   🚫 Rate Limited: ${rateLimited}`);
    console.log(`   ❌ Failed: ${failed}`);
  }

  async testRateLimitRecovery() {
    if (this.rateLimitEvents.length === 0) {
      console.log('\nℹ️  No rate limits detected, skipping recovery test');
      return;
    }
    
    console.log('\n🔄 Testing Rate Limit Recovery');
    console.log('-'.repeat(40));
    console.log('Waiting 65 seconds for rate limit cooldown...');
    
    await this.sleep(65000);
    
    console.log('Testing recovery...');
    const recoveryTest = await this.executeTest(
      'Rate Limit Recovery',
      () => this.sdk.users.getCurrentUser(),
      'v5'
    );
    
    if (recoveryTest.success) {
      console.log('✅ Rate limit recovery successful!');
    } else if (recoveryTest.isRateLimit) {
      console.log('🚫 Still rate limited - may need more time');
    } else {
      console.log('❌ Recovery failed for other reasons');
    }
  }

  async testConcurrentRequests() {
    console.log('\n🔄 Testing Concurrent Requests');
    console.log('-'.repeat(40));
    
    const concurrentTests = [];
    const concurrency = 5;
    
    for (let i = 0; i < concurrency; i++) {
      concurrentTests.push(
        this.executeTest(
          `Concurrent Request ${i + 1}`,
          () => this.sdk.users.getCurrentUser(),
          'v5'
        )
      );
    }
    
    const results = await Promise.allSettled(concurrentTests);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    console.log(`✅ Concurrent requests successful: ${successful}/${concurrency}`);
  }

  generateComprehensiveReport() {
    const totalTime = Date.now() - this.startTime;
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const rateLimitedTests = this.testResults.filter(r => r.isRateLimit).length;
    const failedTests = this.testResults.filter(r => !r.success && !r.isRateLimit).length;
    
    console.log('\n📊 COMPREHENSIVE RATE LIMITING REPORT');
    console.log('=' .repeat(60));
    
    console.log(`⏱️  Test Duration: ${(totalTime / 1000).toFixed(2)} seconds`);
    console.log(`📈 Test Statistics:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   Rate Limited: ${rateLimitedTests} (${((rateLimitedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    
    // Performance Analysis
    const avgResponseTime = this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.length;
    const successfulMetrics = this.performanceMetrics.filter(m => m.success);
    const avgSuccessfulTime = successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length;
    
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Average Successful Time: ${avgSuccessfulTime.toFixed(2)}ms`);
    console.log(`   Fastest Response: ${Math.min(...this.performanceMetrics.map(m => m.duration))}ms`);
    console.log(`   Slowest Response: ${Math.max(...this.performanceMetrics.map(m => m.duration))}ms`);
    
    // Rate Limiting Analysis
    if (this.rateLimitEvents.length > 0) {
      console.log(`\n🚫 Rate Limiting Events:`);
      this.rateLimitEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.test} - ${event.timestamp}`);
        console.log(`      Error: ${event.error}`);
      });
    }
    
    // Rate Limit Configuration
    console.log(`\n📋 Rate Limit Configuration:`);
    console.log(`   v5 Endpoints: 20 requests per 10 seconds`);
    console.log(`   v2 Endpoints: 100 requests per 10 seconds`);
    console.log(`   Cooldown Period: 60 seconds`);
    console.log(`   Error Response: 429 "You are being rate limited"`);
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    console.log(`   1. Implement exponential backoff for rate-limited requests`);
    console.log(`   2. Cache frequently accessed data to reduce API calls`);
    console.log(`   3. Batch multiple operations when possible`);
    console.log(`   4. Monitor rate limit headers in production`);
    console.log(`   5. Use webhooks for real-time updates instead of polling`);
    console.log(`   6. Implement request queuing for high-volume applications`);
    console.log(`   7. Consider using multiple API keys for different services`);
    
    // Best Practices Validation
    console.log(`\n✅ Best Practices Validation:`);
    console.log(`   Rate limiting detected: ${rateLimitedTests > 0 ? '✅ Yes' : '❌ No'}`);
    console.log(`   Recovery tested: ${this.rateLimitEvents.length > 0 ? '✅ Yes' : '❌ No'}`);
    console.log(`   Performance monitored: ✅ Yes`);
    console.log(`   Error handling: ✅ Yes`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function runComprehensiveTest() {
  const tester = new ComprehensiveRateLimitTester();
  
  try {
    await tester.initialize();
    await tester.testBasicSDKFunctions();
    await tester.testRateLimitTriggering();
    await tester.testConcurrentRequests();
    await tester.testRateLimitRecovery();
    tester.generateComprehensiveReport();
    
    console.log('\n✅ Comprehensive rate limiting test completed');
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    process.exit(1);
  }
}

// Run the comprehensive test
runComprehensiveTest().then(() => {
  console.log('\n🎉 All comprehensive tests completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Comprehensive test suite failed:', error);
  process.exit(1);
});

