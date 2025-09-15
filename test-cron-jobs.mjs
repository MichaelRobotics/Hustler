/**
 * Test Cron Job Endpoints
 * 
 * Tests all 10 cron job endpoints to ensure they respond correctly
 * and handle edge cases properly.
 */

const BASE_URL = 'https://hustler-6270acl6g-michaelrobotics-projects.vercel.app';

const cronEndpoints = [
  { path: '/api/cron/poll-phase1-critical', name: 'Phase 1 Critical', schedule: 'Every 1 minute' },
  { path: '/api/cron/poll-phase1-high', name: 'Phase 1 High', schedule: 'Every 2 minutes' },
  { path: '/api/cron/poll-phase1-low', name: 'Phase 1 Low', schedule: 'Every 5 minutes' },
  { path: '/api/cron/poll-phase1-extended', name: 'Phase 1 Extended', schedule: 'Every 30 minutes' },
  { path: '/api/cron/poll-phase1-cleanup', name: 'Phase 1 Cleanup', schedule: 'Daily' },
  { path: '/api/cron/poll-phase2-critical', name: 'Phase 2 Critical', schedule: 'Every 1 minute' },
  { path: '/api/cron/poll-phase2-high', name: 'Phase 2 High', schedule: 'Every 2 minutes' },
  { path: '/api/cron/poll-phase2-low', name: 'Phase 2 Low', schedule: 'Every 5 minutes' },
  { path: '/api/cron/poll-phase2-extended', name: 'Phase 2 Extended', schedule: 'Every 30 minutes' },
  { path: '/api/cron/poll-phase2-cleanup', name: 'Phase 2 Cleanup', schedule: 'Daily' }
];

console.log('🧪 Testing Cron Job Endpoints...\n');

let passedTests = 0;
let totalTests = cronEndpoints.length;

async function testCronEndpoint(endpoint, index) {
  try {
    const url = `${BASE_URL}${endpoint.path}`;
    console.log(`Test ${index + 1}: ${endpoint.name}`);
    console.log(`  URL: ${url}`);
    console.log(`  Schedule: ${endpoint.schedule}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'DM-Monitoring-Test/1.0'
      }
    });
    
    const status = response.status;
    const isSuccess = status === 200;
    
    let responseData = null;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { error: 'Invalid JSON response' };
    }
    
    console.log(`  Status: ${status}`);
    console.log(`  Success: ${isSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (responseData.success !== undefined) {
      console.log(`  Response Success: ${responseData.success}`);
    }
    
    if (responseData.message) {
      console.log(`  Message: ${responseData.message}`);
    }
    
    if (responseData.processed !== undefined) {
      console.log(`  Processed: ${responseData.processed}`);
    }
    
    if (responseData.error) {
      console.log(`  Error: ${responseData.error}`);
    }
    
    console.log('');
    
    if (isSuccess) passedTests++;
    
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    console.log(`  Status: ❌ FAIL\n`);
  }
}

async function runTests() {
  for (let i = 0; i < cronEndpoints.length; i++) {
    await testCronEndpoint(cronEndpoints[i], i);
    // Add small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`📊 Cron Job Test Results:`);
  console.log(`  Passed: ${passedTests}/${totalTests}`);
  console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log(`\n🎉 All cron job tests passed!`);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
  }
}

runTests().catch(console.error);
