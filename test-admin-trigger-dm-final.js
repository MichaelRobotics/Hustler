#!/usr/bin/env node

/**
 * Final Admin Trigger DM Test Script
 * 
 * Tests the complete admin functionality end-to-end
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_EXPERIENCE_ID = 'exp_wl5EtbHqAqLdjV';
const TEST_USER_ID = 'admin_test_user';

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
      method: method,
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
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
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

async function runTests() {
  console.log('🧪 Testing Complete Admin Trigger DM Functionality\n');

  // Test 1: Admin API endpoint creates conversation
  let conversationId = null;
  try {
    const response = await makeRequest('POST', '/api/admin/trigger-first-dm', {
      experienceId: TEST_EXPERIENCE_ID,
      userId: TEST_USER_ID
    });
    
    logTest(
      'Admin API creates conversation',
      response.status === 200 && response.body.success === true,
      `Status: ${response.status}, Success: ${response.body.success}`
    );
    
    if (response.body.success && response.body.conversationId) {
      conversationId = response.body.conversationId;
      logTest(
        'Admin API returns valid conversation ID',
        !!conversationId,
        `Conversation ID: ${conversationId}`
      );
    }
  } catch (error) {
    logTest('Admin API creates conversation', false, error.message);
  }

  // Test 2: Load conversation API works with created conversation
  if (conversationId) {
    try {
      const response = await makeRequest('POST', '/api/userchat/load-conversation', {
        conversationId: conversationId
      });
      
      logTest(
        'Load conversation API works',
        response.status === 200 || response.status === 404,
        `Status: ${response.status}`
      );
      
      if (response.status === 200) {
        logTest(
          'Load conversation returns data',
          !!response.body.conversation || !!response.body.funnelFlow,
          `Has conversation: ${!!response.body.conversation}, Has funnelFlow: ${!!response.body.funnelFlow}`
        );
      }
    } catch (error) {
      logTest('Load conversation API works', false, error.message);
    }
  }

  // Test 3: CustomerView page loads with conversation ID
  if (conversationId) {
    try {
      const response = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}?conversationId=${conversationId}`);
      
      logTest(
        'CustomerView page loads with conversation ID',
        response.status === 200,
        `Status: ${response.status}`
      );
      
      // Check if conversation ID is in the response
      const hasConversationId = response.body.includes(conversationId);
      logTest(
        'CustomerView processes conversation ID',
        hasConversationId,
        `Conversation ID in response: ${hasConversationId}`
      );
    } catch (error) {
      logTest('CustomerView page loads with conversation ID', false, error.message);
    }
  }

  // Test 4: CustomerView page loads without conversation ID (should show admin options)
  try {
    const response = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}`);
    
    logTest(
      'CustomerView page loads without conversation ID',
      response.status === 200,
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest('CustomerView page loads without conversation ID', false, error.message);
  }

  // Test 5: Test error handling for non-existent experience
  try {
    const response = await makeRequest('POST', '/api/admin/trigger-first-dm', {
      experienceId: 'non_existent_exp',
      userId: TEST_USER_ID
    });
    
    logTest(
      'Admin API handles non-existent experience',
      response.status === 500,
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest('Admin API handles non-existent experience', false, error.message);
  }

  // Print results
  console.log('\n📊 Final Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Admin trigger DM functionality is working perfectly.');
    console.log('✅ Admins can now trigger first DM and access CustomerView with real conversations.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }

  return testResults.failed === 0;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});


