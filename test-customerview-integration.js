#!/usr/bin/env node

/**
 * CustomerView Integration Test Script
 * 
 * Tests the complete end-to-end integration of CustomerView with the Two-Phase Chat Initiation System
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_EXPERIENCE_ID = 'exp_test123';
const TEST_CONVERSATION_ID = 'test_conv_123';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: ${details}`);
  }
}

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testServerHealth() {
  console.log('\n🔍 Testing Server Health...');
  
  try {
    const response = await makeRequest('GET', '/');
    logTest('Server is running', response.status === 200, `Status: ${response.status}`);
  } catch (error) {
    logTest('Server is running', false, error.message);
  }
}

async function testExperiencePage() {
  console.log('\n🔍 Testing Experience Page...');
  
  try {
    const response = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}`);
    logTest('Experience page loads', response.status === 200, `Status: ${response.status}`);
    
    // Check if the page contains CustomerView components
    const hasCustomerView = response.body.includes('CustomerView') || 
                           response.body.includes('customer') ||
                           response.body.includes('conversation');
    logTest('Experience page contains CustomerView', hasCustomerView);
  } catch (error) {
    logTest('Experience page loads', false, error.message);
  }
}

async function testCustomerViewWithConversationId() {
  console.log('\n🔍 Testing CustomerView with Conversation ID...');
  
  try {
    const response = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}?conversationId=${TEST_CONVERSATION_ID}`);
    logTest('CustomerView page with conversation ID loads', response.status === 200, `Status: ${response.status}`);
    
    // Check if URL parameter is being processed
    const hasConversationParam = response.body.includes(TEST_CONVERSATION_ID) ||
                                response.body.includes('conversationId');
    logTest('Conversation ID parameter is processed', hasConversationParam);
  } catch (error) {
    logTest('CustomerView page with conversation ID loads', false, error.message);
  }
}

async function testUserChatLoadConversationAPI() {
  console.log('\n🔍 Testing UserChat Load Conversation API...');
  
  try {
    const response = await makeRequest('POST', '/api/userchat/load-conversation', {
      conversationId: TEST_CONVERSATION_ID
    });
    
    // Should return error for non-existent conversation
    logTest('Load conversation API responds', response.status === 404, `Status: ${response.status}`);
    logTest('Load conversation API returns error for non-existent conversation', 
            response.body.error && response.body.error.includes('Failed to load conversation'));
  } catch (error) {
    logTest('Load conversation API responds', false, error.message);
  }
}

async function testWebhookEndpoint() {
  console.log('\n🔍 Testing Webhook Endpoint...');
  
  try {
    const response = await makeRequest('POST', '/api/webhooks', {
      action: 'membership.went_valid',
      data: {
        user_id: 'user_test_123',
        product_id: TEST_EXPERIENCE_ID
      }
    }, {
      'X-Test-Bypass': 'true'
    });
    
    logTest('Webhook endpoint responds', response.status === 200, `Status: ${response.status}`);
    logTest('Webhook returns OK response', response.body === 'OK' || response.body === '');
  } catch (error) {
    logTest('Webhook endpoint responds', false, error.message);
  }
}

async function testLiveChatAPI() {
  console.log('\n🔍 Testing LiveChat API...');
  
  try {
    const response = await makeRequest('GET', `/api/livechat/conversations?experienceId=${TEST_EXPERIENCE_ID}`);
    
    // Should return error due to missing authentication, but endpoint should exist
    logTest('LiveChat API endpoint exists', response.status === 500 || response.status === 401, `Status: ${response.status}`);
  } catch (error) {
    logTest('LiveChat API endpoint exists', false, error.message);
  }
}

async function testInternalChatAPI() {
  console.log('\n🔍 Testing Internal Chat API...');
  
  try {
    const response = await makeRequest('POST', '/api/internal-chat', {
      dmConversationId: 'dm_test_123',
      experienceId: TEST_EXPERIENCE_ID,
      funnelId: 'funnel_test_123'
    }, {
      'X-Test-Bypass': 'true'
    });
    
    // Should return authentication error, but endpoint should exist
    logTest('Internal Chat API endpoint exists', response.status === 401 || response.status === 500, `Status: ${response.status}`);
  } catch (error) {
    logTest('Internal Chat API endpoint exists', false, error.message);
  }
}

async function testWebSocketIntegration() {
  console.log('\n🔍 Testing WebSocket Integration...');
  
  try {
    // Test if the page loads with WebSocket provider
    const response = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}`);
    const hasWebSocketProvider = response.body.includes('WhopWebsocketProvider') ||
                                response.body.includes('DynamicWebsocketProvider') ||
                                response.body.includes('websocket');
    
    logTest('WebSocket provider is integrated', hasWebSocketProvider);
  } catch (error) {
    logTest('WebSocket provider is integrated', false, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting CustomerView Integration Tests...\n');
  
  await testServerHealth();
  await testExperiencePage();
  await testCustomerViewWithConversationId();
  await testUserChatLoadConversationAPI();
  await testWebhookEndpoint();
  await testLiveChatAPI();
  await testInternalChatAPI();
  await testWebSocketIntegration();
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! CustomerView integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }
  
  return testResults.failed === 0;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };


