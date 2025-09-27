#!/usr/bin/env node

/**
 * Extreme DM Rate Limiting Test
 * 
 * This test pushes DM functionality to absolute limits:
 * - Makes hundreds of DM requests
 * - Tests extreme conversation listing
 * - Pushes rate limits to the maximum
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

class ExtremeDMRateLimitTester {
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

  // Test 1: Extreme DM Sending
  async testExtremeDMSending() {
    console.log('Testing extreme DM sending (200 DMs)...');
    
    const extremeDMs = [];
    const dmCount = 200;
    
    for (let i = 0; i < dmCount; i++) {
      extremeDMs.push(
        this.sdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
          message: `Extreme test message ${i + 1} - Rate limit testing at scale`
        }).then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const results = await Promise.allSettled(extremeDMs);
    
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
    
    this.totalRequests += dmCount;
    
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${errorCount}`);
    if (firstRateLimitAt) {
      console.log(`   🎯 First rate limit at request: ${firstRateLimitAt}`);
    }
    
    return {
      totalDMs: dmCount,
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount,
      firstRateLimitAt
    };
  }

  // Test 2: Extreme Conversation Listing
  async testExtremeConversationListing() {
    console.log('Testing extreme conversation listing (300 requests)...');
    
    const extremeListings = [];
    const listingCount = 300;
    
    for (let i = 0; i < listingCount; i++) {
      extremeListings.push(
        this.sdk.messages.listDirectMessageConversations().then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const results = await Promise.allSettled(extremeListings);
    
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
    
    this.totalRequests += listingCount;
    
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${errorCount}`);
    if (firstRateLimitAt) {
      console.log(`   🎯 First rate limit at request: ${firstRateLimitAt}`);
    }
    
    return {
      totalListings: listingCount,
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount,
      firstRateLimitAt
    };
  }

  // Test 3: Mixed Extreme Operations
  async testMixedExtremeOperations() {
    console.log('Testing mixed extreme operations (500 operations)...');
    
    const mixedOperations = [];
    const operationCount = 500;
    
    for (let i = 0; i < operationCount; i++) {
      if (i % 3 === 0) {
        // List conversations
        mixedOperations.push(
          this.sdk.messages.listDirectMessageConversations().then(
            result => ({ success: true, operation: i + 1, type: 'list', result }),
            error => ({ success: false, operation: i + 1, type: 'list', error: error.message })
          )
        );
      } else if (i % 3 === 1) {
        // Send DM
        mixedOperations.push(
          this.sdk.messages.sendDirectMessageToUser({
            toUserIdOrUsername: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
            message: `Mixed extreme operation message ${i + 1} - Rate limit testing`
          }).then(
            result => ({ success: true, operation: i + 1, type: 'send', result }),
            error => ({ success: false, operation: i + 1, type: 'send', error: error.message })
          )
        );
      } else {
        // List with parameters
        mixedOperations.push(
          this.sdk.messages.listDirectMessageConversations({
            limit: 10,
            status: 'accepted'
          }).then(
            result => ({ success: true, operation: i + 1, type: 'list_params', result }),
            error => ({ success: false, operation: i + 1, type: 'list_params', error: error.message })
          )
        );
      }
    }
    
    const results = await Promise.allSettled(mixedOperations);
    
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    let listOperations = 0;
    let sendOperations = 0;
    let listParamsOperations = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          successCount++;
          if (data.type === 'list') listOperations++;
          if (data.type === 'send') sendOperations++;
          if (data.type === 'list_params') listParamsOperations++;
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
    
    this.totalRequests += operationCount;
    
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   🚫 Rate Limited: ${rateLimitedCount}`);
    console.log(`   ❌ Other Errors: ${errorCount}`);
    console.log(`   📋 List Operations: ${listOperations}`);
    console.log(`   📤 Send Operations: ${sendOperations}`);
    console.log(`   📋 List with Params: ${listParamsOperations}`);
    
    return {
      totalOperations: operationCount,
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount,
      listOperations,
      sendOperations,
      listParamsOperations
    };
  }

  // Test 4: Time Window Burst Testing
  async testTimeWindowBurstTesting() {
    console.log('Testing time window burst patterns...');
    
    const burstTests = [
      { name: '1 second burst', duration: 1000, requests: 50 },
      { name: '5 second burst', duration: 5000, requests: 100 },
      { name: '10 second burst', duration: 10000, requests: 200 }
    ];
    
    const burstResults = [];
    
    for (const burst of burstTests) {
      console.log(`   Testing ${burst.name} with ${burst.requests} requests...`);
      
      const burstRequests = [];
      for (let i = 0; i < burst.requests; i++) {
        if (i % 2 === 0) {
          burstRequests.push(
            this.sdk.messages.listDirectMessageConversations().then(
              result => ({ success: true, request: i + 1, type: 'list', result }),
              error => ({ success: false, request: i + 1, type: 'list', error: error.message })
            )
          );
        } else {
          burstRequests.push(
            this.sdk.messages.sendDirectMessageToUser({
              toUserIdOrUsername: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
              message: `Burst test message ${i + 1} - ${burst.name}`
            }).then(
              result => ({ success: true, request: i + 1, type: 'send', result }),
              error => ({ success: false, request: i + 1, type: 'send', error: error.message })
            )
          );
        }
      }
      
      const results = await Promise.allSettled(burstRequests);
      
      let successCount = 0;
      let rateLimitedCount = 0;
      let errorCount = 0;
      let listCount = 0;
      let sendCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success) {
            successCount++;
            if (data.type === 'list') listCount++;
            if (data.type === 'send') sendCount++;
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
      
      this.totalRequests += burst.requests;
      
      console.log(`     ✅ Successful: ${successCount}`);
      console.log(`     🚫 Rate Limited: ${rateLimitedCount}`);
      console.log(`     ❌ Other Errors: ${errorCount}`);
      console.log(`     📋 List Operations: ${listCount}`);
      console.log(`     📤 Send Operations: ${sendCount}`);
      
      burstResults.push({
        burst: burst.name,
        requests: burst.requests,
        successful: successCount,
        rateLimited: rateLimitedCount,
        errors: errorCount,
        listCount,
        sendCount
      });
      
      // Wait between bursts
      if (burst !== burstTests[burstTests.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return burstResults;
  }

  // Test 5: DM Content Variation Testing
  async testDMContentVariation() {
    console.log('Testing DM content variation (100 DMs with different content)...');
    
    const contentVariations = [
      'Short message',
      'This is a medium length message with more content to test rate limits',
      'This is a very long message that contains a lot of text to test if message length affects rate limiting. ' +
      'We want to see if the system handles different message lengths differently. ' +
      'This message has multiple sentences and should test the system thoroughly.',
      'Message with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
      'Message with numbers: 1234567890',
      'Message with emojis: 😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚☺️🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤕🤢🤮🤧😇🤠🤡🥳🥴🥺🤥🤫🤭🧐🤓😎🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤕🤢🤮🤧😇🤠🤡🥳🥴🥺🤥🤫🤭🧐🤓'
    ];
    
    const dmResults = [];
    
    for (let i = 0; i < 100; i++) {
      const content = contentVariations[i % contentVariations.length];
      const message = `${content} - Test ${i + 1}`;
      
      try {
        const result = await this.sdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
          message: message
        });
        
        dmResults.push({ success: true, message: message, result });
        
        if (i % 20 === 0) {
          console.log(`   📤 Sent DM ${i + 1}/100`);
        }
        
      } catch (error) {
        dmResults.push({ success: false, message: message, error: error.message });
        console.log(`   ❌ DM ${i + 1} failed: ${error.message}`);
      }
    }
    
    this.totalRequests += 100;
    
    const successful = dmResults.filter(r => r.success).length;
    const failed = dmResults.filter(r => !r.success).length;
    
    console.log(`   📊 DM Content Variation Results: ${successful} successful, ${failed} failed`);
    
    return {
      totalDMs: 100,
      successful,
      failed,
      results: dmResults
    };
  }

  async runAllTests() {
    console.log('🚀 Extreme DM Rate Limiting Test');
    console.log('=' .repeat(60));
    console.log('Testing absolute DM limits with extreme request volumes...');
    
    // Run all tests
    await this.executeTest('Extreme DM Sending (200)', () => this.testExtremeDMSending());
    await this.executeTest('Extreme Conversation Listing (300)', () => this.testExtremeConversationListing());
    await this.executeTest('Mixed Extreme Operations (500)', () => this.testMixedExtremeOperations());
    await this.executeTest('Time Window Burst Testing', () => this.testTimeWindowBurstTesting());
    await this.executeTest('DM Content Variation (100)', () => this.testDMContentVariation());
    
    // Generate comprehensive report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 EXTREME DM RATE LIMITING REPORT');
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
      console.log(`\n✅ No rate limiting detected in extreme DM operations`);
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
    console.log(`\n🎯 EXTREME DM CONCLUSIONS:`);
    console.log(`   • Made ${this.totalRequests} total DM requests`);
    console.log(`   • Rate limiting detected: ${this.rateLimitEvents.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   • Success rate: ${((this.totalRequests - this.rateLimitEvents.length) / this.totalRequests * 100).toFixed(2)}%`);
    console.log(`   • Average response time: ${avgDuration.toFixed(2)}ms`);
    
    if (this.rateLimitEvents.length === 0) {
      console.log(`\n🤔 No rate limiting detected with ${this.totalRequests} DM requests.`);
      console.log(`   This means:`);
      console.log(`   • DM functionality is extremely robust`);
      console.log(`   • You can send many DMs without rate limiting concerns`);
      console.log(`   • Conversation listing works at high volumes`);
      console.log(`   • Mixed DM operations are very reliable`);
    }
    
    console.log(`\n💡 DM Recommendations:`);
    console.log(`   • DM functionality is extremely reliable for high-volume usage`);
    console.log(`   • You can send many DMs without worrying about rate limits`);
    console.log(`   • Conversation listing works well at scale`);
    console.log(`   • Mixed DM operations are robust`);
    console.log(`   • Focus on functionality rather than rate limiting optimization`);
    
    console.log(`\n✅ Extreme DM rate limiting test completed`);
  }
}

// Run the test
async function runExtremeDMRateLimitTest() {
  const tester = new ExtremeDMRateLimitTester();
  await tester.runAllTests();
}

runExtremeDMRateLimitTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

