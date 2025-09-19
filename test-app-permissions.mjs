#!/usr/bin/env node

/**
 * Test script to check what permissions our app has
 */

const WHOP_API_BASE = 'https://api.whop.com/api';
const API_KEY = process.env.WHOP_API_KEY;

if (!API_KEY) {
  console.error('❌ WHOP_API_KEY environment variable is required');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

async function testAppPermissions() {
  console.log('🔍 Testing App Permissions...\n');

  try {
    // Test 1: Check what endpoints we can access
    console.log('📋 Testing accessible endpoints...');
    
    const endpoints = [
      '/v2/plans',
      '/v2/companies',
      '/v2/companies/biz_VjqUDhcKO2cAuG',
      '/v2/companies/biz_VjqUDhcKO2cAuG/plans',
      '/v2/companies/biz_VjqUDhcKO2cAuG/members',
      '/v2/companies/biz_VjqUDhcKO2cAuG/memberships',
      '/v2/companies/biz_VjqUDhcKO2cAuG/access_passes',
      '/v2/analytics',
      '/v2/analytics/companies/biz_VjqUDhcKO2cAuG',
      '/v5/companies',
      '/v5/companies/biz_VjqUDhcKO2cAuG'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${WHOP_API_BASE}${endpoint}`, {
          method: 'GET',
          headers
        });
        
        if (response.ok) {
          console.log(`✅ ${endpoint} - Accessible (${response.status})`);
          const data = await response.json();
          console.log(`   Data keys:`, Object.keys(data));
        } else {
          console.log(`❌ ${endpoint} - Not accessible (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }

    // Test 2: Check if we can access our own company data
    console.log('\n📋 Testing own company access...');
    
    try {
      const ownCompanyResponse = await fetch(`${WHOP_API_BASE}/v2/companies`, {
        method: 'GET',
        headers
      });
      
      if (ownCompanyResponse.ok) {
        const ownCompanyData = await ownCompanyResponse.json();
        console.log('✅ Own company data accessible');
        console.log('📊 Companies:', ownCompanyData.data?.map(c => ({ id: c.id, name: c.name })));
      } else {
        console.log('❌ Own company data not accessible');
      }
    } catch (error) {
      console.log('❌ Error accessing own company:', error.message);
    }

    // Test 3: Check if we can access webhook data
    console.log('\n📋 Testing webhook access...');
    
    try {
      const webhookResponse = await fetch(`${WHOP_API_BASE}/v2/webhooks`, {
        method: 'GET',
        headers
      });
      
      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        console.log('✅ Webhook data accessible');
        console.log('📊 Webhooks:', webhookData.data?.length || 0);
      } else {
        console.log('❌ Webhook data not accessible');
      }
    } catch (error) {
      console.log('❌ Error accessing webhooks:', error.message);
    }

    // Test 4: Check if we can access analytics
    console.log('\n📋 Testing analytics access...');
    
    try {
      const analyticsResponse = await fetch(`${WHOP_API_BASE}/v2/analytics`, {
        method: 'GET',
        headers
      });
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        console.log('✅ Analytics accessible');
        console.log('📊 Analytics keys:', Object.keys(analyticsData));
      } else {
        console.log('❌ Analytics not accessible');
      }
    } catch (error) {
      console.log('❌ Error accessing analytics:', error.message);
    }

  } catch (error) {
    console.error('❌ Permission test failed:', error.message);
  }
}

async function testAlternativeApproaches() {
  console.log('\n🔍 Testing Alternative Approaches...\n');

  console.log('📋 Approach 1: Use webhook data only');
  console.log(`
  // Instead of creating tracking links via API, use webhook data
  // The webhook already contains all the info you need:
  const webhookData = {
    data: {
      user_id: 'user_123',
      product_id: 'prod_456',
      plan_id: 'plan_789',
      page_id: 'biz_VjqUDhcKO2cAuG', // Company ID
      checkout_id: 'checkout_abc'
    }
  };
  
  // Store funnel context in your database before redirect
  await storeFunnelContext({
    userId: webhookData.data.user_id,
    companyId: webhookData.data.page_id,
    productId: webhookData.data.product_id,
    planId: webhookData.data.plan_id,
    funnelId: 'funnel_123',
    blockId: 'offer_block'
  });
  `);

  console.log('\n📋 Approach 2: Use checkout session metadata');
  console.log(`
  // Create checkout session with metadata
  const checkoutSession = await whopSdk.payments.createCheckoutSession({
    planId: "plan_123",
    metadata: {
      funnelId: "funnel_456",
      blockId: "offer_block",
      companyId: "biz_VjqUDhcKO2cAuG"
    }
  });
  
  // Webhook will include this metadata
  const webhookData = {
    data: {
      plan_id: "plan_123",
      metadata: {
        funnelId: "funnel_456",
        blockId: "offer_block",
        companyId: "biz_VjqUDhcKO2cAuG"
      }
    }
  };
  `);

  console.log('\n📋 Approach 3: Use URL parameters');
  console.log(`
  // Add custom parameters to checkout URL
  const trackingUrl = \`https://whop.com/checkout/plan_123?funnel_id=funnel_456&block_id=offer_block&company_id=biz_VjqUDhcKO2cAuG\`;
  
  // Store mapping before redirect
  await storeFunnelMapping(webhookData.data.user_id, {
    funnelId: 'funnel_456',
    blockId: 'offer_block',
    companyId: 'biz_VjqUDhcKO2cAuG',
    planId: 'plan_123'
  });
  `);
}

// Run the tests
async function main() {
  console.log('🚀 Starting App Permissions Test\n');
  console.log('=' .repeat(50));
  
  await testAppPermissions();
  await testAlternativeApproaches();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Test completed');
}

main().catch(console.error);
