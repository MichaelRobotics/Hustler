#!/usr/bin/env node

/**
 * Create quick link for specific product using Whop API
 * Product: https://whop.com/profit-pulse-ai/test-ea-e887/
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createQuickLinkForProduct() {
  console.log('🔗 Creating Quick Link for Profit Pulse AI Product');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  
  console.log(`Company ID: ${companyId}`);
  console.log(`Product URL: https://whop.com/profit-pulse-ai/test-ea-e887/`);
  
  try {
    // First, let's try to get the product/plan ID from the URL
    // The URL suggests this might be a product with route "test-ea-e887"
    console.log('\n🔍 Attempting to find product/plan ID...');
    
    // Try different API endpoints to find the product
    const endpoints = [
      `https://api.whop.com/api/v2/access_passes?company_id=${companyId}`,
      `https://api.whop.com/api/v2/plans?company_id=${companyId}`,
      `https://api.whop.com/api/v2/products?company_id=${companyId}`
    ];
    
    let productData = null;
    let planId = null;
    
    for (const endpoint of endpoints) {
      console.log(`\n🧪 Trying: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Whop-Version': '2023-11-09'
          }
        });
        
        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Success: Found ${data.data?.length || 0} items`);
          
          if (data.data && data.data.length > 0) {
            // Look for the specific product
            const targetProduct = data.data.find(item => 
              item.route === 'test-ea-e887' || 
              item.title?.toLowerCase().includes('leadcapture') ||
              item.title?.toLowerCase().includes('test')
            );
            
            if (targetProduct) {
              console.log(`   🎯 Found target product: ${targetProduct.title}`);
              console.log(`   ID: ${targetProduct.id}`);
              productData = targetProduct;
              planId = targetProduct.id;
              break;
            }
          }
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Error: ${errorText}`);
        }
      } catch (error) {
        console.log(`   ❌ Exception: ${error.message}`);
      }
    }
    
    if (!planId) {
      console.log('\n❌ Could not find the product/plan ID');
      console.log('This might be because:');
      console.log('1. The product is not accessible via API');
      console.log('2. API permissions are insufficient');
      console.log('3. The product ID format is different');
      
      // Let's try a different approach - create a quick link with a known format
      console.log('\n🔄 Trying alternative approach...');
      
      // Try to create a quick link using the route as plan ID
      const routeBasedId = 'test-ea-e887';
      console.log(`Trying with route-based ID: ${routeBasedId}`);
      
      await createQuickLinkWithId(apiKey, routeBasedId, 'profit-pulse-test');
    } else {
      console.log(`\n✅ Found plan ID: ${planId}`);
      await createQuickLinkWithId(apiKey, planId, 'profit-pulse-test');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function createQuickLinkWithId(apiKey, planId, shortLinkName) {
  console.log(`\n🚀 Creating quick link for plan: ${planId}`);
  
  const payload = {
    short_link: shortLinkName,
    payment_link_description: 'Profit Pulse AI - LeadCapture Testing',
    internal_notes: 'Created via API for funnel system',
    metadata: {
      product_url: 'https://whop.com/profit-pulse-ai/test-ea-e887/',
      created_by: 'funnel_system',
      company_id: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID
    }
  };
  
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`https://api.whop.com/api/v2/plans/${planId}/create_quick_link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Whop-Version': '2023-11-09'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`\n📡 Response Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Quick link created successfully!');
      console.log('📊 Response:', JSON.stringify(data, null, 2));
      
      if (data.short_link) {
        const shortUrl = `https://whop.com/${data.short_link}`;
        console.log(`\n🔗 Your short link: ${shortUrl}`);
        console.log(`🎯 Redirects to: https://whop.com/profit-pulse-ai/test-ea-e887/`);
        
        console.log('\n📊 Dashboard Information:');
        console.log(`   Dashboard URL: https://whop.com/dashboard/${process.env.NEXT_PUBLIC_WHOP_COMPANY_ID}/marketing/tracking-links`);
        console.log(`   Short Link: ${data.short_link}`);
        console.log(`   Plan ID: ${planId}`);
        
        console.log('\n✅ Check your Whop dashboard to see the new quick link!');
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Quick link creation failed');
      console.log('📊 Error Response:', errorData);
      
      // Try alternative API versions
      console.log('\n🔄 Trying alternative API version...');
      await tryAlternativeApiVersions(apiKey, planId, shortLinkName);
    }
  } catch (error) {
    console.error('❌ Error creating quick link:', error);
  }
}

async function tryAlternativeApiVersions(apiKey, planId, shortLinkName) {
  const apiVersions = ['2024-01-01', '2023-11-09', '2023-10-01'];
  
  for (const version of apiVersions) {
    console.log(`\n🧪 Trying API version: ${version}`);
    
    try {
      const response = await fetch(`https://api.whop.com/api/v2/plans/${planId}/create_quick_link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Whop-Version': version
        },
        body: JSON.stringify({
          short_link: shortLinkName,
          payment_link_description: 'Profit Pulse AI - LeadCapture Testing'
        })
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success with version ${version}!`);
        console.log(`   Short link: https://whop.com/${data.short_link}`);
        return;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
}

// Run the script
createQuickLinkForProduct().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

