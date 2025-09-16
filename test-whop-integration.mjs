#!/usr/bin/env node

/**
 * Test script for Whop Integration Implementation
 * 
 * This script tests the main functionality of the Whop integration system:
 * 1. App discovery and sync
 * 2. Membership sync
 * 3. Click tracking
 * 4. Analytics
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env.development.local' });
config({ path: '.env' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data
const TEST_DATA = {
  experienceId: 'test-experience-id',
  companyId: 'test-company-id',
  userId: 'test-user-id',
  funnelId: 'test-funnel-id',
  resourceId: 'test-resource-id'
};

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function testAppSync() {
  console.log('\n🧪 Testing App Sync...');
  
  const result = await makeRequest('/api/sync/whop-apps', 'POST', {
    experienceId: TEST_DATA.experienceId,
    companyId: TEST_DATA.companyId
  });
  
  if (result.ok) {
    console.log('✅ App sync successful:', result.data);
  } else {
    console.log('❌ App sync failed:', result.data || result.error);
  }
  
  return result.ok;
}

async function testMembershipSync() {
  console.log('\n🧪 Testing Membership Sync...');
  
  const result = await makeRequest('/api/sync/whop-memberships', 'POST', {
    experienceId: TEST_DATA.experienceId,
    companyId: TEST_DATA.companyId
  });
  
  if (result.ok) {
    console.log('✅ Membership sync successful:', result.data);
  } else {
    console.log('❌ Membership sync failed:', result.data || result.error);
  }
  
  return result.ok;
}

async function testClickTracking() {
  console.log('\n🧪 Testing Click Tracking...');
  
  const result = await makeRequest('/api/track/click', 'POST', {
    resourceId: TEST_DATA.resourceId,
    userId: TEST_DATA.userId,
    experienceId: TEST_DATA.experienceId,
    funnelId: TEST_DATA.funnelId
  });
  
  if (result.ok) {
    console.log('✅ Click tracking successful:', result.data);
  } else {
    console.log('❌ Click tracking failed:', result.data || result.error);
  }
  
  return result.ok;
}

async function testWebhookIntegration() {
  console.log('\n🧪 Testing Webhook Integration...');
  
  const webhookPayload = {
    event: 'app.installed',
    data: {
      companyId: TEST_DATA.companyId,
      experienceId: TEST_DATA.experienceId,
      appId: 'test-app-id'
    }
  };
  
  const result = await makeRequest('/api/webhooks/whop', 'POST', webhookPayload);
  
  if (result.ok) {
    console.log('✅ Webhook integration successful:', result.data);
  } else {
    console.log('❌ Webhook integration failed:', result.data || result.error);
  }
  
  return result.ok;
}

async function testEnvironmentVariables() {
  console.log('\n🧪 Testing Environment Variables...');
  
  const requiredVars = [
    'WHOP_API_KEY',
    'NEXT_PUBLIC_WHOP_APP_ID'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length === 0) {
    console.log('✅ All required environment variables are set');
    return true;
  } else {
    console.log('❌ Missing environment variables:', missing);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Whop Integration Tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  const results = {
    environment: await testEnvironmentVariables(),
    appSync: await testAppSync(),
    membershipSync: await testMembershipSync(),
    clickTracking: await testClickTracking(),
    webhookIntegration: await testWebhookIntegration()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.padEnd(20)} ${status}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Whop integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testAppSync, testMembershipSync, testClickTracking, testWebhookIntegration };
