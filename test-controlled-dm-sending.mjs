#!/usr/bin/env node

/**
 * Controlled DM Sending Test
 * 
 * This test sends DMs one by one with detailed tracking
 * to see exactly what happens with each DM
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { WhopServerSdk } from '@whop/api';

class ControlledDMSendingTester {
  constructor() {
    this.sdk = WhopServerSdk({
      appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
      appApiKey: process.env.WHOP_API_KEY,
      onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,
      companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
    });
    
    this.targetUserId = 'user_L8YwhuixVcRCf';
    this.sentDMs = [];
    this.failedDMs = [];
  }

  async sendDMWithTracking(message, dmNumber) {
    const startTime = Date.now();
    console.log(`\n📤 Sending DM ${dmNumber}: "${message}"`);
    
    try {
      const result = await this.sdk.messages.sendDirectMessageToUser({
        toUserIdOrUsername: this.targetUserId,
        message: message
      });
      
      const duration = Date.now() - startTime;
      console.log(`   ✅ DM ${dmNumber} sent successfully in ${duration}ms`);
      console.log(`   📋 Result: ${JSON.stringify(result, null, 2)}`);
      
      this.sentDMs.push({
        dmNumber,
        message,
        result,
        duration,
        timestamp: new Date().toISOString()
      });
      
      return { success: true, result, duration };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ DM ${dmNumber} failed in ${duration}ms: ${error.message}`);
      console.log(`   📋 Error details: ${JSON.stringify(error, null, 2)}`);
      
      this.failedDMs.push({
        dmNumber,
        message,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, error: error.message, duration };
    }
  }

  async testControlledDMSending() {
    console.log('🚀 Controlled DM Sending Test');
    console.log('=' .repeat(60));
    console.log(`Testing controlled DM sending to: ${this.targetUserId}`);
    console.log('Each DM will be sent individually with detailed tracking...\n');
    
    // Test 1: Send 5 DMs one by one with delays
    console.log('📋 Test 1: 5 DMs with 2-second delays');
    console.log('-'.repeat(40));
    
    for (let i = 1; i <= 5; i++) {
      await this.sendDMWithTracking(`Controlled test DM ${i} - Rate limit testing`, i);
      
      if (i < 5) {
        console.log('   ⏳ Waiting 2 seconds before next DM...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Test 2: Send 10 DMs one by one with 1-second delays
    console.log('\n📋 Test 2: 10 DMs with 1-second delays');
    console.log('-'.repeat(40));
    
    for (let i = 6; i <= 15; i++) {
      await this.sendDMWithTracking(`Controlled test DM ${i} - Rate limit testing`, i);
      
      if (i < 15) {
        console.log('   ⏳ Waiting 1 second before next DM...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Test 3: Send 5 DMs one by one with 500ms delays
    console.log('\n📋 Test 3: 5 DMs with 500ms delays');
    console.log('-'.repeat(40));
    
    for (let i = 16; i <= 20; i++) {
      await this.sendDMWithTracking(`Controlled test DM ${i} - Rate limit testing`, i);
      
      if (i < 20) {
        console.log('   ⏳ Waiting 500ms before next DM...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Test 4: Send 5 DMs one by one with no delays
    console.log('\n📋 Test 4: 5 DMs with no delays');
    console.log('-'.repeat(40));
    
    for (let i = 21; i <= 25; i++) {
      await this.sendDMWithTracking(`Controlled test DM ${i} - Rate limit testing`, i);
    }
    
    // Generate detailed report
    this.generateDetailedReport();
  }

  generateDetailedReport() {
    console.log('\n📊 CONTROLLED DM SENDING REPORT');
    console.log('=' .repeat(60));
    
    const totalDMs = this.sentDMs.length + this.failedDMs.length;
    const successfulDMs = this.sentDMs.length;
    const failedDMs = this.failedDMs.length;
    
    console.log(`📈 DM Statistics:`);
    console.log(`   Total DMs Attempted: ${totalDMs}`);
    console.log(`   Successful: ${successfulDMs} (${((successfulDMs/totalDMs)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failedDMs} (${((failedDMs/totalDMs)*100).toFixed(1)}%)`);
    
    if (this.sentDMs.length > 0) {
      const avgDuration = this.sentDMs.reduce((sum, dm) => sum + dm.duration, 0) / this.sentDMs.length;
      const fastestDM = Math.min(...this.sentDMs.map(dm => dm.duration));
      const slowestDM = Math.max(...this.sentDMs.map(dm => dm.duration));
      
      console.log(`\n⚡ Performance Metrics:`);
      console.log(`   Average Duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`   Fastest DM: ${fastestDM}ms`);
      console.log(`   Slowest DM: ${slowestDM}ms`);
    }
    
    // Successful DMs details
    if (this.sentDMs.length > 0) {
      console.log(`\n✅ Successful DMs:`);
      this.sentDMs.forEach(dm => {
        console.log(`   ${dm.dmNumber}. "${dm.message}" (${dm.duration}ms)`);
      });
    }
    
    // Failed DMs details
    if (this.failedDMs.length > 0) {
      console.log(`\n❌ Failed DMs:`);
      this.failedDMs.forEach(dm => {
        console.log(`   ${dm.dmNumber}. "${dm.message}" - ${dm.error}`);
      });
    }
    
    // Analysis
    console.log(`\n🔍 Analysis:`);
    console.log(`   • Target User: ${this.targetUserId}`);
    console.log(`   • Successful DMs: ${successfulDMs}`);
    console.log(`   • Failed DMs: ${failedDMs}`);
    
    if (failedDMs === 0) {
      console.log(`   • All DMs were sent successfully`);
      console.log(`   • No rate limiting detected`);
      console.log(`   • DM functionality is working properly`);
    } else {
      console.log(`   • Some DMs failed - check error details above`);
      console.log(`   • This might indicate rate limiting or other issues`);
    }
    
    console.log(`\n💡 Recommendations:`);
    if (failedDMs === 0) {
      console.log(`   • DM functionality is working well`);
      console.log(`   • You can send DMs without rate limiting concerns`);
      console.log(`   • Consider the delay between DMs for better user experience`);
    } else {
      console.log(`   • Some DMs failed - investigate the error messages`);
      console.log(`   • Consider adding retry logic for failed DMs`);
      console.log(`   • Monitor for rate limiting patterns`);
    }
    
    console.log(`\n✅ Controlled DM sending test completed`);
  }
}

// Run the test
async function runControlledDMSendingTest() {
  const tester = new ControlledDMSendingTester();
  await tester.testControlledDMSending();
}

runControlledDMSendingTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});



