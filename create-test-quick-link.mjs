#!/usr/bin/env node

/**
 * Test script to create a Whop quick link and verify it appears in dashboard
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function createTestQuickLink() {
  console.log('🔗 Creating Test Whop Quick Link');
  console.log('=' .repeat(50));
  
  try {
    // Check environment variables
    const apiKey = process.env.WHOP_API_KEY;
    const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
    const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    
    console.log('🔍 Environment Check:');
    console.log(`   WHOP_API_KEY: ${apiKey ? '✅ Found' : '❌ Missing'}`);
    console.log(`   NEXT_PUBLIC_WHOP_APP_ID: ${appId ? '✅ Found' : '❌ Missing'}`);
    console.log(`   NEXT_PUBLIC_WHOP_COMPANY_ID: ${companyId ? '✅ Found' : '❌ Missing'}`);
    
    if (!apiKey || !appId || !companyId) {
      console.log('\n❌ Missing required environment variables');
      console.log('Please check your .env.local file');
      return;
    }
    
    // First, let's get a list of available plans to use for the quick link
    console.log('\n📋 Fetching available plans...');
    
    const plansResponse = await fetch(`https://api.whop.com/api/v2/plans?company_id=${companyId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Whop-Version': '2023-11-09'
      }
    });
    
    if (!plansResponse.ok) {
      console.log('❌ Failed to fetch plans');
      const errorText = await plansResponse.text();
      console.log('Error:', errorText);
      return;
    }
    
    const plansData = await plansResponse.json();
    console.log(`✅ Found ${plansData.data?.length || 0} plans`);
    
    if (!plansData.data || plansData.data.length === 0) {
      console.log('❌ No plans found. You need at least one plan to create a quick link.');
      return;
    }
    
    // Use the first available plan
    const testPlan = plansData.data[0];
    console.log(`\n🎯 Using plan: ${testPlan.title} (ID: ${testPlan.id})`);
    
    // Create the quick link
    console.log('\n🚀 Creating quick link...');
    
    const quickLinkPayload = {
      short_link: `test-funnel-${Date.now()}`,
      payment_link_description: 'Test funnel quick link',
      internal_notes: 'Created via API test script',
      metadata: {
        created_by: 'funnel_system',
        test: true
      }
    };
    
    console.log('📤 Payload:', JSON.stringify(quickLinkPayload, null, 2));
    
    const quickLinkResponse = await fetch(`https://api.whop.com/api/v2/plans/${testPlan.id}/create_quick_link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Whop-Version': '2023-11-09'
      },
      body: JSON.stringify(quickLinkPayload)
    });
    
    console.log(`\n📡 Response Status: ${quickLinkResponse.status}`);
    
    if (quickLinkResponse.ok) {
      const quickLinkData = await quickLinkResponse.json();
      console.log('✅ Quick link created successfully!');
      console.log('📊 Response:', JSON.stringify(quickLinkData, null, 2));
      
      if (quickLinkData.short_link) {
        const shortUrl = `https://whop.com/${quickLinkData.short_link}`;
        console.log(`\n🔗 Your short link: ${shortUrl}`);
        console.log(`🎯 Redirects to: ${testPlan.title}`);
        
        console.log('\n📊 Dashboard Information:');
        console.log(`   Dashboard URL: https://whop.com/dashboard/${companyId}/marketing/tracking-links`);
        console.log(`   Short Link: ${quickLinkData.short_link}`);
        console.log(`   Plan: ${testPlan.title}`);
        console.log(`   Plan ID: ${testPlan.id}`);
        
        console.log('\n✅ Check your Whop dashboard to see the new quick link!');
      }
    } else {
      const errorData = await quickLinkResponse.text();
      console.log('❌ Quick link creation failed');
      console.log('📊 Error Response:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error creating quick link:', error);
  }
}

// Run the test
createTestQuickLink().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
