#!/usr/bin/env node

/**
 * Admin Trigger DM Fix Test
 * 
 * Tests the complete flow and identifies the issue
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_EXPERIENCE_ID = 'exp_wl5EtbHqAqLdjV';
const TEST_USER_ID = 'admin_test_user';

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

async function testFlow() {
  console.log('🔍 Testing Admin Trigger DM Flow\n');

  // Step 1: Create conversation
  console.log('1. Creating conversation...');
  const createResponse = await makeRequest('POST', '/api/admin/trigger-first-dm', {
    experienceId: TEST_EXPERIENCE_ID,
    userId: TEST_USER_ID
  });
  
  console.log(`   Status: ${createResponse.status}`);
  console.log(`   Success: ${createResponse.body.success}`);
  console.log(`   Conversation ID: ${createResponse.body.conversationId}`);
  
  if (!createResponse.body.success) {
    console.log(`   Error: ${createResponse.body.error}`);
    return;
  }

  const conversationId = createResponse.body.conversationId;

  // Step 2: Test load conversation API
  console.log('\n2. Testing load conversation API...');
  const loadResponse = await makeRequest('POST', '/api/userchat/load-conversation', {
    conversationId: conversationId
  });
  
  console.log(`   Status: ${loadResponse.status}`);
  console.log(`   Body: ${JSON.stringify(loadResponse.body, null, 2)}`);

  // Step 3: Test CustomerView page
  console.log('\n3. Testing CustomerView page...');
  const pageResponse = await makeRequest('GET', `/experiences/${TEST_EXPERIENCE_ID}?conversationId=${conversationId}`);
  
  console.log(`   Status: ${pageResponse.status}`);
  console.log(`   Has conversation ID in response: ${pageResponse.body.includes(conversationId)}`);

  console.log('\n✅ Test complete!');
}

testFlow().catch(console.error);


