#!/usr/bin/env node

/**
 * Admin Trigger DM Test Script
 * 
 * Tests the admin functionality to artificially trigger the first DM
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_EXPERIENCE_ID = 'exp_test123';
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
  console.log('🧪 Testing Admin Trigger DM Functionality\n');

  // Test 1: Admin API endpoint exists and responds
  try {
    const response = await makeRequest('POST', '/api/admin/trigger-first-dm', {
      experienceId: TEST_EXPERIENCE_ID,
      userId: TEST_USER_ID
    });
    
    logTest(
      'Admin API endpoint responds',
      response.status === 200,
      `Status: ${response.status}`
    );
    
    if (response.status === 200) {
      logTest(
        'Admin API returns success response',
        response.body.success === true,
        `Success: ${response.body.success}`
      );
      
      logTest(
        'Admin API returns conversation ID',
        !!response.body.conversationId,
        `Conversation ID: ${response.body.conversationId}`
      );
    }
  } catch (error) {
    logTest('Admin API endpoint responds', false, error.message);
  }

  // Test 2: Test with missing experience ID
  try {
    const response = await makeRequest('POST', '/api/admin/trigger-first-dm', {
      userId: TEST_USER_ID
    });
    
    logTest(
      'Admin API validates experience ID',
      response.status === 400,
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest('Admin API validates experience ID', false, error.message);
  }

  // Test 3: Test with missing user ID
  try {
    const response = await makeRequest('POST', '/api/admin/trigger-first-dm', {
      experienceId: TEST_EXPERIENCE_ID
    });
    
    logTest(
      'Admin API validates user ID',
      response.status === 400,
      `Status: ${response.status}`
    );
  } catch (error) {
    logTest('Admin API validates user ID', false, error.message);
  }

  // Test 4: Test CustomerView page loads (even with 404 for non-existent experience)
  try {
    const response = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}`);
    
    logTest(
      'CustomerView page loads',
      response.status === 200 || response.status === 404,
      `Status: ${response.status} (404 expected for non-existent experience)`
    );
  } catch (error) {
    logTest('CustomerView page loads', false, error.message);
  }

  // Test 5: Test CustomerView with conversation ID parameter
  try {
    const response = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}?conversationId=test_conv_123`);
    
    logTest(
      'CustomerView with conversation ID loads',
      response.status === 200 || response.status === 404,
      `Status: ${response.status} (404 expected for non-existent experience)`
    );
  } catch (error) {
    logTest('CustomerView with conversation ID loads', false, error.message);
  }

  // Print results
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Admin trigger DM functionality is working correctly.');
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


