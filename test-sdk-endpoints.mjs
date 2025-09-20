#!/usr/bin/env node

/**
 * Test Whop SDK API endpoints instead of REST API
 * SDK endpoints have different permission requirements and may work with minimal scopes
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testSDKEndpoints() {
  console.log('🔍 Testing Whop SDK API Endpoints');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  const userId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  
  console.log('🔑 Environment Variables:');
  console.log(`   API Key: ${apiKey ? '✅ Found' : '❌ Missing'}`);
  console.log(`   Company ID: ${companyId}`);
  console.log(`   App ID: ${appId}`);
  console.log(`   User ID: ${userId}`);
  
  if (!apiKey || !companyId || !userId) {
    console.log('\n❌ Missing required environment variables');
    return;
  }
  
  // Test SDK endpoints (different from REST API)
  const sdkTests = [
    {
      name: 'List Experiences (SDK)',
      url: `https://api.whop.com/sdk/api/experiences/list-experiences?company_id=${companyId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-on-behalf-of': userId,
        'x-company-id': companyId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'List Access Passes for Experience (SDK)',
      url: `https://api.whop.com/sdk/api/experiences/list-access-passes-for-experience?experienceId=exp_u2Z4n51MqBdr0X`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-on-behalf-of': userId,
        'x-company-id': companyId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Get Access Pass by ID (SDK)',
      url: `https://api.whop.com/sdk/api/access-passes/get-access-pass?accessPassId=prod_VgRKhVC0TQnsE`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-on-behalf-of': userId,
        'x-company-id': companyId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Check User Access to Experience (SDK)',
      url: `https://api.whop.com/sdk/api/access/check-if-user-has-access-to-experience?experienceId=exp_u2Z4n51MqBdr0X&userId=${userId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-on-behalf-of': userId,
        'x-company-id': companyId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Get Current User (SDK)',
      url: `https://api.whop.com/sdk/api/users/get-current-user`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-on-behalf-of': userId,
        'x-company-id': companyId,
        'Content-Type': 'application/json'
      }
    }
  ];
  
  console.log('\n🧪 Testing SDK API Endpoints:');
  console.log('=' .repeat(60));
  
  let workingEndpoints = [];
  let failingEndpoints = [];
  
  for (const test of sdkTests) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: test.headers
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS: ${JSON.stringify(data).substring(0, 200)}...`);
        workingEndpoints.push({
          ...test,
          status: response.status,
          data: data
        });
        
        // Show specific data for access passes
        if (test.name.includes('Access Pass') && data.accessPass) {
          console.log(`   📊 Access Pass Details:`);
          console.log(`      ID: ${data.accessPass.id}`);
          console.log(`      Title: ${data.accessPass.title}`);
          console.log(`      Route: ${data.accessPass.route}`);
          console.log(`      Company: ${data.accessPass.company?.title}`);
        }
        
        // Show specific data for experiences
        if (test.name.includes('Experiences') && data.experiencesV2?.nodes) {
          console.log(`   📊 Found ${data.experiencesV2.nodes.length} experiences:`);
          data.experiencesV2.nodes.forEach((exp, index) => {
            console.log(`      ${index + 1}. ${exp.name} (${exp.id})`);
          });
        }
        
      } else {
        const errorText = await response.text();
        console.log(`   ❌ FAILED: ${errorText}`);
        failingEndpoints.push({
          ...test,
          status: response.status,
          error: errorText
        });
      }
    } catch (error) {
      console.log(`   ❌ EXCEPTION: ${error.message}`);
      failingEndpoints.push({
        ...test,
        status: 'EXCEPTION',
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('=' .repeat(60));
  console.log(`✅ Working SDK endpoints: ${workingEndpoints.length}`);
  console.log(`❌ Failing SDK endpoints: ${failingEndpoints.length}`);
  
  if (workingEndpoints.length > 0) {
    console.log('\n✅ WORKING SDK ENDPOINTS:');
    workingEndpoints.forEach(ep => {
      console.log(`   - ${ep.name}: ${ep.status}`);
    });
    
    // Try to find your specific product using SDK endpoints
    console.log('\n🔍 Looking for your specific product using SDK...');
    for (const workingEndpoint of workingEndpoints) {
      if (workingEndpoint.name.includes('Access Pass') && workingEndpoint.data?.accessPass) {
        const accessPass = workingEndpoint.data.accessPass;
        console.log(`\n📋 Found Access Pass:`);
        console.log(`   Title: ${accessPass.title}`);
        console.log(`   ID: ${accessPass.id}`);
        console.log(`   Route: ${accessPass.route}`);
        console.log(`   Company: ${accessPass.company?.title}`);
        
        // Check if this matches your target
        if (accessPass.route === 'test-ea-e887' || accessPass.title?.toLowerCase().includes('leadcapture')) {
          console.log(`   🎯 THIS IS YOUR TARGET PRODUCT!`);
          
          // Try to create quick link using SDK endpoint
          console.log(`\n🚀 Attempting to create quick link using SDK...`);
          await tryCreateQuickLinkSDK(apiKey, userId, companyId, accessPass.id, 'profit-pulse-test');
        }
      }
    }
  }
  
  if (failingEndpoints.length > 0) {
    console.log('\n❌ FAILING SDK ENDPOINTS:');
    failingEndpoints.forEach(ep => {
      console.log(`   - ${ep.name}: ${ep.status}`);
    });
  }
  
  // Additional test: Try GraphQL endpoint
  console.log('\n🔍 Testing GraphQL Endpoint:');
  console.log('=' .repeat(60));
  await testGraphQLEndpoint(apiKey, userId, companyId);
}

async function testGraphQLEndpoint(apiKey, userId, companyId) {
  const graphqlQuery = {
    query: `
      query {
        company(id: "${companyId}") {
          id
          title
          accessPasses {
            nodes {
              id
              title
              route
            }
          }
        }
      }
    `
  };
  
  try {
    const response = await fetch('https://api.whop.com/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-on-behalf-of': userId,
        'x-company-id': companyId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ GraphQL SUCCESS: ${JSON.stringify(data).substring(0, 300)}...`);
      
      if (data.data?.company?.accessPasses?.nodes) {
        console.log(`   📊 Found ${data.data.company.accessPasses.nodes.length} access passes:`);
        data.data.company.accessPasses.nodes.forEach((pass, index) => {
          console.log(`      ${index + 1}. ${pass.title} (${pass.id}) - Route: ${pass.route}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ GraphQL FAILED: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ GraphQL EXCEPTION: ${error.message}`);
  }
}

async function tryCreateQuickLinkSDK(apiKey, userId, companyId, productId, shortLinkName) {
  console.log(`\n🔗 Creating quick link for product: ${productId}`);
  
  // Try different SDK endpoints for quick link creation
  const sdkEndpoints = [
    {
      name: 'SDK Plans Create Quick Link',
      url: `https://api.whop.com/sdk/api/plans/create-quick-link`,
      payload: {
        planId: productId,
        shortLink: shortLinkName,
        redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
      }
    },
    {
      name: 'SDK Access Pass Create Quick Link',
      url: `https://api.whop.com/sdk/api/access-passes/create-quick-link`,
      payload: {
        accessPassId: productId,
        shortLink: shortLinkName,
        redirectUrl: 'https://whop.com/c/test-ea-e887/my-test'
      }
    }
  ];
  
  for (const endpoint of sdkEndpoints) {
    console.log(`\n🧪 Trying: ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Payload:`, JSON.stringify(endpoint.payload, null, 2));
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'x-on-behalf-of': userId,
          'x-company-id': companyId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(endpoint.payload)
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Quick link created:`);
        console.log(`      Response: ${JSON.stringify(data, null, 2)}`);
        return;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
  
  console.log('\n❌ All SDK quick link creation attempts failed');
}

// Run the test
testSDKEndpoints().then(() => {
  console.log('\n✅ SDK Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ SDK Test failed:', error);
  process.exit(1);
});

