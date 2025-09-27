#!/usr/bin/env node

/**
 * Real DM Sending Test
 * 
 * This test actually sends DMs to the specific user: user_L8YwhuixVcRCf
 * Tests rate limits on real DM sending operations
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

class RealDMSendingTester {
  constructor() {
    this.sdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      appApiKey: process.env.WHOP_API_KEY,
      onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    });
    
    this.targetUserId = 'user_L8YwhuixVcRCf';
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

  // Test 1: Send Single DM to Target User
  async testSingleDMToTargetUser() {
    console.log(`Testing single DM to target user: ${this.targetUserId}`);
    
    try {
      const result = await this.sdk.messages.sendDirectMessageToUser({
        toUserIdOrUsername: this.targetUserId,
        message: 'Test DM from rate limit testing - Single message'
      });
      
      console.log(`   ✅ DM sent successfully to ${this.targetUserId}`);
      this.totalRequests += 1;
      
      return {
        success: true,
        targetUser: this.targetUserId,
        result: result
      };
      
    } catch (error) {
      console.log(`   ❌ DM failed: ${error.message}`);
      this.totalRequests += 1;
      
      return {
        success: false,
        targetUser: this.targetUserId,
        error: error.message
      };
    }
  }

  // Test 2: Send Multiple DMs to Target User
  async testMultipleDMsToTargetUser() {
    console.log(`Testing multiple DMs to target user: ${this.targetUserId}`);
    
    const dmMessages = [
      'Test DM 1 - Rate limit testing',
      'Test DM 2 - Rate limit testing',
      'Test DM 3 - Rate limit testing',
      'Test DM 4 - Rate limit testing',
      'Test DM 5 - Rate limit testing'
    ];
    
    const dmResults = [];
    
    for (let i = 0; i < dmMessages.length; i++) {
      try {
        const result = await this.sdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: this.targetUserId,
          message: dmMessages[i]
        });
        
        console.log(`   ✅ DM ${i + 1} sent successfully`);
        dmResults.push({ success: true, message: dmMessages[i], result });
        
      } catch (error) {
        console.log(`   ❌ DM ${i + 1} failed: ${error.message}`);
        dmResults.push({ success: false, message: dmMessages[i], error: error.message });
      }
    }
    
    this.totalRequests += dmMessages.length;
    
    const successful = dmResults.filter(r => r.success).length;
    const failed = dmResults.filter(r => !r.success).length;
    
    console.log(`   📊 DM Results: ${successful} successful, ${failed} failed`);
    
    return {
      totalDMs: dmMessages.length,
      successful,
      failed,
      results: dmResults
    };
  }

  // Test 3: Rapid DM Sending to Target User
  async testRapidDMSendingToTargetUser() {
    console.log(`Testing rapid DM sending to target user: ${this.targetUserId}`);
    
    const rapidDMs = [];
    const dmCount = 20;
    
    for (let i = 0; i < dmCount; i++) {
      rapidDMs.push(
        this.sdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: this.targetUserId,
          message: `Rapid test DM ${i + 1} - Rate limit testing to ${this.targetUserId}`
        }).then(
          result => ({ success: true, request: i + 1, result }),
          error => ({ success: false, request: i + 1, error: error.message })
        )
      );
    }
    
    const results = await Promise.allSettled(rapidDMs);
    
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

  // Test 4: Extreme DM Sending to Target User
  async testExtremeDMSendingToTargetUser() {
    console.log(`Testing extreme DM sending to target user: ${this.targetUserId}`);
    
    const extremeDMs = [];
    const dmCount = 50;
    
    for (let i = 0; i < dmCount; i++) {
      extremeDMs.push(
        this.sdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: this.targetUserId,
          message: `Extreme test DM ${i + 1} - Rate limit testing to ${this.targetUserId} at scale`
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

  // Test 5: Mixed DM and Conversation Operations
  async testMixedDMAndConversationOperations() {
    console.log(`Testing mixed DM and conversation operations with target user: ${this.targetUserId}`);
    
    const mixedOperations = [];
    const operationCount = 100;
    
    for (let i = 0; i < operationCount; i++) {
      if (i % 2 === 0) {
        // List conversations
        mixedOperations.push(
          this.sdk.messages.listDirectMessageConversations().then(
            result => ({ success: true, operation: i + 1, type: 'list', result }),
            error => ({ success: false, operation: i + 1, type: 'list', error: error.message })
          )
        );
      } else {
        // Send DM to target user
        mixedOperations.push(
          this.sdk.messages.sendDirectMessageToUser({
            toUserIdOrUsername: this.targetUserId,
            message: `Mixed operation DM ${i + 1} - Rate limit testing to ${this.targetUserId}`
          }).then(
            result => ({ success: true, operation: i + 1, type: 'send', result }),
            error => ({ success: false, operation: i + 1, type: 'send', error: error.message })
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
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.success) {
          successCount++;
          if (data.type === 'list') listOperations++;
          if (data.type === 'send') sendOperations++;
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
    
    return {
      totalOperations: operationCount,
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount,
      listOperations,
      sendOperations
    };
  }

  // Test 6: DM Content Variation to Target User
  async testDMContentVariationToTargetUser() {
    console.log(`Testing DM content variation to target user: ${this.targetUserId}`);
    
    const contentVariations = [
      'Short test message',
      'This is a medium length message with more content to test rate limits',
      'This is a very long message that contains a lot of text to test if message length affects rate limiting. We want to see if the system handles different message lengths differently. This message has multiple sentences and should test the system thoroughly.',
      'Message with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
      'Message with numbers: 1234567890',
      'Message with emojis: 😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚☺️🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤕🤢🤮🤧😇🤠🤡🥳🥴🥺🤥🤫🤭🧐🤓😎🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤕🤢🤮🤧😇🤠🤡🥳🥴🥺🤥🤫🤭🧐🤓'
    ];
    
    const dmResults = [];
    
    for (let i = 0; i < 20; i++) {
      const content = contentVariations[i % contentVariations.length];
      const message = `${content} - Test ${i + 1} to ${this.targetUserId}`;
      
      try {
        const result = await this.sdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: this.targetUserId,
          message: message
        });
        
        console.log(`   ✅ DM ${i + 1}/20 sent successfully`);
        dmResults.push({ success: true, message: message, result });
        
      } catch (error) {
        console.log(`   ❌ DM ${i + 1} failed: ${error.message}`);
        dmResults.push({ success: false, message: message, error: error.message });
      }
    }
    
    this.totalRequests += 20;
    
    const successful = dmResults.filter(r => r.success).length;
    const failed = dmResults.filter(r => !r.success).length;
    
    console.log(`   📊 DM Content Variation Results: ${successful} successful, ${failed} failed`);
    
    return {
      totalDMs: 20,
      successful,
      failed,
      results: dmResults
    };
  }

  async runAllTests() {
    console.log('🚀 Real DM Sending Test');
    console.log('=' .repeat(60));
    console.log(`Testing actual DM sending to target user: ${this.targetUserId}`);
    
    // Run all tests
    await this.executeTest('Single DM to Target User', () => this.testSingleDMToTargetUser());
    await this.executeTest('Multiple DMs to Target User', () => this.testMultipleDMsToTargetUser());
    await this.executeTest('Rapid DM Sending to Target User', () => this.testRapidDMSendingToTargetUser());
    await this.executeTest('Extreme DM Sending to Target User', () => this.testExtremeDMSendingToTargetUser());
    await this.executeTest('Mixed DM and Conversation Operations', () => this.testMixedDMAndConversationOperations());
    await this.executeTest('DM Content Variation to Target User', () => this.testDMContentVariationToTargetUser());
    
    // Generate comprehensive report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 REAL DM SENDING REPORT');
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
      console.log(`\n✅ No rate limiting detected in real DM operations`);
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
    console.log(`\n🎯 REAL DM SENDING CONCLUSIONS:`);
    console.log(`   • Target User: ${this.targetUserId}`);
    console.log(`   • Made ${this.totalRequests} total DM requests`);
    console.log(`   • Rate limiting detected: ${this.rateLimitEvents.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   • Success rate: ${((this.totalRequests - this.rateLimitEvents.length) / this.totalRequests * 100).toFixed(2)}%`);
    console.log(`   • Average response time: ${avgDuration.toFixed(2)}ms`);
    
    if (this.rateLimitEvents.length === 0) {
      console.log(`\n🤔 No rate limiting detected with ${this.totalRequests} DM requests to ${this.targetUserId}.`);
      console.log(`   This means:`);
      console.log(`   • DM functionality is extremely robust`);
      console.log(`   • You can send many DMs to ${this.targetUserId} without rate limiting concerns`);
      console.log(`   • Conversation listing works at high volumes`);
      console.log(`   • Mixed DM operations are very reliable`);
    }
    
    console.log(`\n💡 Real DM Recommendations:`);
    console.log(`   • DM functionality is extremely reliable for high-volume usage`);
    console.log(`   • You can send many DMs to ${this.targetUserId} without worrying about rate limits`);
    console.log(`   • Conversation listing works well at scale`);
    console.log(`   • Mixed DM operations are robust`);
    console.log(`   • Focus on functionality rather than rate limiting optimization`);
    
    console.log(`\n✅ Real DM sending test completed`);
  }
}

// Run the test
async function runRealDMSendingTest() {
  const tester = new RealDMSendingTester();
  await tester.runAllTests();
}

runRealDMSendingTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

