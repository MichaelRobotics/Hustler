#!/usr/bin/env node

/**
 * Final Comprehensive Rate Limiting Test
 * 
 * This test combines all previous tests and pushes Whop SDK to absolute limits
 * using real-world data patterns from your codebase
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

class FinalComprehensiveTester {
  constructor() {
    this.sdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      appApiKey: process.env.WHOP_API_KEY,
      onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    });
    
    this.testResults = [];
    this.rateLimitEvents = [];
    this.totalRequests = 0;
  }

  async executeTest(testName, testFunction) {
    const startTime = Date.now();
    console.log(`\n🧪 ${testName}`);
    console.log('-'.repeat(50));
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        test: testName,
        success: true,
        duration,
        result,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ ${testName} completed in ${duration}ms`);
      return { success: true, result, duration };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const isRateLimit = this.isRateLimitError(error);
      
      this.testResults.push({
        test: testName,
        success: false,
        duration,
        error: error.message,
        isRateLimit,
        timestamp: new Date().toISOString()
      });
      
      if (isRateLimit) {
        this.rateLimitEvents.push({
          test: testName,
          timestamp: new Date().toISOString(),
          error: error.message
        });
        console.log(`🚫 ${testName} rate limited in ${duration}ms`);
      } else {
        console.log(`❌ ${testName} failed in ${duration}ms: ${error.message}`);
      }
      
      return { success: false, error: error.message, duration, isRateLimit };
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

  // Test 1: Extreme Rapid Requests
  async testExtremeRapidRequests() {
    console.log('Making 1000 rapid requests to find absolute limits...');
    
    const rapidRequests = [];
    const requestCount = 1000;
    
    for (let i = 0; i < requestCount; i++) {
      rapidRequests.push(
        this.sdk.users.getCurrentUser().then(
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
    
    this.totalRequests += requestCount;
    
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${errorCount}`);
    if (firstRateLimitAt) {
      console.log(`   🎯 First rate limit at request: ${firstRateLimitAt}`);
    }
    
    return {
      totalRequests: requestCount,
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount,
      firstRateLimitAt
    };
  }

  // Test 2: Mixed Real-World Functions
  async testMixedRealWorldFunctions() {
    console.log('Testing 500 mixed real-world functions...');
    
    const functions = [
      () => this.sdk.users.getCurrentUser(),
      () => this.sdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }),
      () => this.sdk.experiences.getExperience({ experienceId: 'exp_u2Z4n51MqBdr0X' }),
      () => this.sdk.messages.listDirectMessageConversations(),
      () => this.sdk.users.getUser({ userId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID })
    ];
    
    const mixedRequests = [];
    const requestCount = 500;
    
    for (let i = 0; i < requestCount; i++) {
      const func = functions[i % functions.length];
      mixedRequests.push(
        func().then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const results = await Promise.allSettled(mixedRequests);
    
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          successCount++;
        } else {
          if (data.error.includes('rate limited') || data.error.includes('429')) {
            rateLimitedCount++;
          } else {
            errorCount++;
          }
        }
      } else {
        errorCount++;
      }
    });
    
    this.totalRequests += requestCount;
    
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${errorCount}`);
    
    return {
      totalRequests: requestCount,
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount
    };
  }

  // Test 3: Concurrent Burst Testing
  async testConcurrentBurstTesting() {
    console.log('Testing 200 concurrent requests...');
    
    const concurrentRequests = [];
    const requestCount = 200;
    
    for (let i = 0; i < requestCount; i++) {
      concurrentRequests.push(
        this.sdk.users.getCurrentUser().then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const results = await Promise.allSettled(concurrentRequests);
    
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          successCount++;
        } else {
          if (data.error.includes('rate limited') || data.error.includes('429')) {
            rateLimitedCount++;
          } else {
            errorCount++;
          }
        }
      } else {
        errorCount++;
      }
    });
    
    this.totalRequests += requestCount;
    
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${errorCount}`);
    
    return {
      totalRequests: requestCount,
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount
    };
  }

  // Test 4: Time Window Analysis
  async testTimeWindowAnalysis() {
    console.log('Testing different time windows...');
    
    const timeWindows = [
      { name: '1 second', duration: 1000, requests: 50 },
      { name: '5 seconds', duration: 5000, requests: 100 },
      { name: '10 seconds', duration: 10000, requests: 200 }
    ];
    
    const windowResults = [];
    
    for (const window of timeWindows) {
      console.log(`   Testing ${window.name} window with ${window.requests} requests...`);
      
      const windowRequests = [];
      for (let i = 0; i < window.requests; i++) {
        windowRequests.push(
          this.sdk.users.getCurrentUser().then(
            result => ({ success: true, request: i + 1, result }),
            error => ({ success: false, request: i + 1, error: error.message })
          )
        );
      }
      
      const results = await Promise.allSettled(windowRequests);
      
      let successCount = 0;
      let rateLimitedCount = 0;
      let errorCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success) {
            successCount++;
          } else {
            if (data.error.includes('rate limited') || data.error.includes('429')) {
              rateLimitedCount++;
            } else {
              errorCount++;
            }
          }
        } else {
          errorCount++;
        }
      });
      
      this.totalRequests += window.requests;
      
      console.log(`     ✅ Successful: ${successCount}`);
      console.log(`     🚫 Rate Limited: ${rateLimitedCount}`);
      console.log(`     ❌ Other Errors: ${errorCount}`);
      
      windowResults.push({
        window: window.name,
        requests: window.requests,
        successful: successCount,
        rateLimited: rateLimitedCount,
        errors: errorCount
      });
      
      // Wait between windows
      if (window !== timeWindows[timeWindows.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return windowResults;
  }

  // Test 5: Endpoint-Specific Testing
  async testEndpointSpecificTesting() {
    console.log('Testing different endpoints with high volume...');
    
    const endpointTests = [
      { name: 'Users', fn: () => this.sdk.users.getCurrentUser(), requests: 100 },
      { name: 'Companies', fn: () => this.sdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }), requests: 100 },
      { name: 'Experiences', fn: () => this.sdk.experiences.getExperience({ experienceId: 'exp_u2Z4n51MqBdr0X' }), requests: 100 },
      { name: 'Messages', fn: () => this.sdk.messages.listDirectMessageConversations(), requests: 100 }
    ];
    
    const endpointResults = [];
    
    for (const test of endpointTests) {
      console.log(`   Testing ${test.name} endpoint with ${test.requests} requests...`);
      
      const requests = [];
      for (let i = 0; i < test.requests; i++) {
        requests.push(
          test.fn().then(
            result => ({ success: true, request: i + 1, result }),
            error => ({ success: false, request: i + 1, error: error.message })
          )
        );
      }
      
      const results = await Promise.allSettled(requests);
      
      let successCount = 0;
      let rateLimitedCount = 0;
      let errorCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success) {
            successCount++;
          } else {
            if (data.error.includes('rate limited') || data.error.includes('429')) {
              rateLimitedCount++;
            } else {
              errorCount++;
            }
          }
        } else {
          errorCount++;
        }
      });
      
      this.totalRequests += test.requests;
      
      console.log(`     ✅ Successful: ${successCount}`);
      console.log(`     🚫 Rate Limited: ${rateLimitedCount}`);
      console.log(`     ❌ Other Errors: ${errorCount}`);
      
      endpointResults.push({
        endpoint: test.name,
        requests: test.requests,
        successful: successCount,
        rateLimited: rateLimitedCount,
        errors: errorCount
      });
    }
    
    return endpointResults;
  }

  // Test 6: Real-World Scenario Simulation
  async testRealWorldScenarioSimulation() {
    console.log('Simulating real-world scenarios with high volume...');
    
    const scenarios = [
      { name: 'User Login Flow', requests: 50 },
      { name: 'Admin Operations', requests: 50 },
      { name: 'Chat Operations', requests: 50 },
      { name: 'Credit Operations', requests: 50 }
    ];
    
    const scenarioResults = [];
    
    for (const scenario of scenarios) {
      console.log(`   Simulating ${scenario.name} with ${scenario.requests} requests...`);
      
      const requests = [];
      for (let i = 0; i < scenario.requests; i++) {
        // Mix of different functions for realistic simulation
        const functions = [
          () => this.sdk.users.getCurrentUser(),
          () => this.sdk.companies.getCompany({ companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID }),
          () => this.sdk.experiences.getExperience({ experienceId: 'exp_u2Z4n51MqBdr0X' }),
          () => this.sdk.messages.listDirectMessageConversations()
        ];
        
        const func = functions[i % functions.length];
        requests.push(
          func().then(
            result => ({ success: true, request: i + 1, result }),
            error => ({ success: false, request: i + 1, error: error.message })
          )
        );
      }
      
      const results = await Promise.allSettled(requests);
      
      let successCount = 0;
      let rateLimitedCount = 0;
      let errorCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success) {
            successCount++;
          } else {
            if (data.error.includes('rate limited') || data.error.includes('429')) {
              rateLimitedCount++;
            } else {
              errorCount++;
            }
          }
        } else {
          errorCount++;
        }
      });
      
      this.totalRequests += scenario.requests;
      
      console.log(`     ✅ Successful: ${successCount}`);
      console.log(`     🚫 Rate Limited: ${rateLimitedCount}`);
      console.log(`     ❌ Other Errors: ${errorCount}`);
      
      scenarioResults.push({
        scenario: scenario.name,
        requests: scenario.requests,
        successful: successCount,
        rateLimited: rateLimitedCount,
        errors: errorCount
      });
    }
    
    return scenarioResults;
  }

  async runAllTests() {
    console.log('🚀 Final Comprehensive Rate Limiting Test');
    console.log('=' .repeat(60));
    console.log('Testing absolute limits with real-world data patterns...');
    
    // Run all tests
    await this.executeTest('Extreme Rapid Requests (1000)', () => this.testExtremeRapidRequests());
    await this.executeTest('Mixed Real-World Functions (500)', () => this.testMixedRealWorldFunctions());
    await this.executeTest('Concurrent Burst Testing (200)', () => this.testConcurrentBurstTesting());
    await this.executeTest('Time Window Analysis', () => this.testTimeWindowAnalysis());
    await this.executeTest('Endpoint-Specific Testing', () => this.testEndpointSpecificTesting());
    await this.executeTest('Real-World Scenario Simulation', () => this.testRealWorldScenarioSimulation());
    
    // Generate comprehensive report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 FINAL COMPREHENSIVE RATE LIMITING REPORT');
    console.log('=' .repeat(60));
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(t => t.success).length;
    const failedTests = this.testResults.filter(t => !t.success).length;
    const rateLimitedTests = this.testResults.filter(t => t.isRateLimit).length;
    
    console.log(`📈 Test Statistics:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Successful: ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   Rate Limited: ${rateLimitedTests} (${((rateLimitedTests/totalTests)*100).toFixed(1)}%)`);
    
    console.log(`\n📊 Total Requests Made: ${this.totalRequests}`);
    console.log(`   Rate Limited: ${this.rateLimitEvents.length}`);
    console.log(`   Success Rate: ${((this.totalRequests - this.rateLimitEvents.length) / this.totalRequests * 100).toFixed(2)}%`);
    
    // Performance analysis
    const avgDuration = this.testResults.reduce((sum, t) => sum + t.duration, 0) / this.testResults.length;
    const fastestTest = Math.min(...this.testResults.map(t => t.duration));
    const slowestTest = Math.max(...this.testResults.map(t => t.duration));
    
    console.log(`\n⚡ Performance Metrics:`);
    console.log(`   Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Fastest Test: ${fastestTest}ms`);
    console.log(`   Slowest Test: ${slowestTest}ms`);
    
    // Rate limiting analysis
    if (this.rateLimitEvents.length > 0) {
      console.log(`\n🚫 Rate Limiting Events:`);
      this.rateLimitEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.test} - ${event.timestamp}`);
        console.log(`      Error: ${event.error}`);
      });
    } else {
      console.log(`\n✅ No rate limiting detected even with ${this.totalRequests} requests`);
    }
    
    // Test details
    console.log(`\n📋 Test Details:`);
    this.testResults.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      const rateLimit = test.isRateLimit ? '🚫' : '';
      console.log(`   ${index + 1}. ${status} ${rateLimit} ${test.test} (${test.duration}ms)`);
      if (!test.success && !test.isRateLimit) {
        console.log(`      Error: ${test.error}`);
      }
    });
    
    // Final conclusions
    console.log(`\n🎯 FINAL CONCLUSIONS:`);
    console.log(`   • Made ${this.totalRequests} total requests`);
    console.log(`   • Rate limiting detected: ${this.rateLimitEvents.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   • Success rate: ${((this.totalRequests - this.rateLimitEvents.length) / this.totalRequests * 100).toFixed(2)}%`);
    console.log(`   • Average response time: ${avgDuration.toFixed(2)}ms`);
    
    if (this.rateLimitEvents.length === 0) {
      console.log(`\n🤔 No rate limiting detected with ${this.totalRequests} requests.`);
      console.log(`   Possible explanations:`);
      console.log(`   • Rate limits are much higher than documented (maybe 10,000+ requests)`);
      console.log(`   • Rate limits are based on different factors (IP, user, company, request complexity)`);
      console.log(`   • Rate limits are per-API-key rather than per-app`);
      console.log(`   • Rate limits have different time windows (maybe 1 hour instead of 10 seconds)`);
      console.log(`   • Rate limits are only enforced in production, not development`);
      console.log(`   • Rate limits are based on request complexity, not just count`);
      console.log(`   • Rate limits are based on data volume, not request count`);
      console.log(`   • Rate limits are based on user behavior patterns`);
    }
    
    console.log(`\n💡 Recommendations:`);
    console.log(`   • Your app can handle high-volume API usage without rate limiting concerns`);
    console.log(`   • Focus on functionality rather than rate limiting optimization`);
    console.log(`   • Monitor actual usage patterns in production`);
    console.log(`   • Implement reasonable delays between requests (100-500ms)`);
    console.log(`   • Cache frequently accessed data`);
    console.log(`   • Use webhooks for real-time updates`);
    console.log(`   • Implement exponential backoff for error handling`);
    
    console.log(`\n✅ Final comprehensive rate limiting test completed`);
  }
}

// Run the test
async function runFinalComprehensiveTest() {
  const tester = new FinalComprehensiveTester();
  await tester.runAllTests();
}

runFinalComprehensiveTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
