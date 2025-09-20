#!/usr/bin/env node

/**
 * Create quick link using the correct Whop API format
 * Product: https://whop.com/c/test-ea-e887/my-test
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createQuickLinkCorrect() {
  console.log('🔗 Creating Quick Link with Correct API Format');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  
  console.log(`Company ID: ${companyId}`);
  console.log(`Product URL: https://whop.com/c/test-ea-e887/my-test`);
  
  try {
    // First, let's try to find the plan ID by looking at access passes
    console.log('\n🔍 Searching for access passes...');
    
    const accessPassesResponse = await fetch(`https://api.whop.com/api/v2/access_passes?company_id=${companyId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Whop-Version': '2023-11-09'
      }
    });
    
    console.log(`Access Passes Status: ${accessPassesResponse.status}`);
    
    if (accessPassesResponse.ok) {
      const accessPassesData = await accessPassesResponse.json();
      console.log(`✅ Found ${accessPassesData.data?.length || 0} access passes`);
      
      if (accessPassesData.data && accessPassesData.data.length > 0) {
        // Look for the specific product by route
        const targetProduct = accessPassesData.data.find(item => 
          item.route === 'test-ea-e887' || 
          item.title?.toLowerCase().includes('leadcapture') ||
          item.title?.toLowerCase().includes('test')
        );
        
        if (targetProduct) {
          console.log(`\n🎯 Found target product: ${targetProduct.title}`);
          console.log(`   ID: ${targetProduct.id}`);
          console.log(`   Route: ${targetProduct.route}`);
          
          // Now try to create a quick link using the access pass ID
          await createQuickLinkForAccessPass(apiKey, targetProduct.id, 'profit-pulse-test');
        } else {
          console.log('❌ Target product not found in access passes');
          console.log('Available products:');
          accessPassesData.data.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.title} (ID: ${item.id}, Route: ${item.route})`);
          });
        }
      }
    } else {
      const errorText = await accessPassesResponse.text();
      console.log(`❌ Access passes error: ${errorText}`);
      
      // Try alternative approach - use the route as plan ID
      console.log('\n🔄 Trying alternative approach with route...');
      await createQuickLinkForAccessPass(apiKey, 'test-ea-e887', 'profit-pulse-test');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function createQuickLinkForAccessPass(apiKey, accessPassId, shortLinkName) {
  console.log(`\n🚀 Creating quick link for access pass: ${accessPassId}`);
  
  // Try the correct API endpoint format
  const payload = {
    name: shortLinkName,
    redirect_url: `https://whop.com/c/test-ea-e887/my-test`,
    max_uses: null
  };
  
  console.log('📤 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    // Try the correct endpoint format
    const response = await fetch(`https://api.whop.com/api/v2/plans/${accessPassId}/create_quick_link`, {
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
      
      if (data.url) {
        console.log(`\n🔗 Your short link: ${data.url}`);
        console.log(`🎯 Redirects to: https://whop.com/c/test-ea-e887/my-test`);
        
        console.log('\n📊 Dashboard Information:');
        console.log(`   Dashboard URL: https://whop.com/dashboard/${process.env.NEXT_PUBLIC_WHOP_COMPANY_ID}/marketing/tracking-links`);
        console.log(`   Quick Link ID: ${data.id}`);
        console.log(`   Access Pass ID: ${accessPassId}`);
        
        console.log('\n✅ Check your Whop dashboard to see the new quick link!');
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Quick link creation failed');
      console.log('📊 Error Response:', errorData);
      
      // Try alternative API versions
      console.log('\n🔄 Trying alternative API versions...');
      await tryAlternativeApiVersions(apiKey, accessPassId, shortLinkName);
    }
  } catch (error) {
    console.error('❌ Error creating quick link:', error);
  }
}

async function tryAlternativeApiVersions(apiKey, accessPassId, shortLinkName) {
  const apiVersions = ['2024-01-01', '2023-11-09', '2023-10-01'];
  
  for (const version of apiVersions) {
    console.log(`\n🧪 Trying API version: ${version}`);
    
    try {
      const response = await fetch(`https://api.whop.com/api/v2/plans/${accessPassId}/create_quick_link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Whop-Version': version
        },
        body: JSON.stringify({
          name: shortLinkName,
          redirect_url: `https://whop.com/c/test-ea-e887/my-test`
        })
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success with version ${version}!`);
        console.log(`   Quick link: ${data.url}`);
        console.log(`   ID: ${data.id}`);
        return;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
  }
  
  console.log('\n❌ All API versions failed. This might be due to:');
  console.log('1. Insufficient API permissions');
  console.log('2. Incorrect access pass ID');
  console.log('3. API key scope limitations');
  console.log('4. Product not accessible via API');
}

// Run the script
createQuickLinkCorrect().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

