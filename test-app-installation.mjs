#!/usr/bin/env node

/**
 * Test script to simulate app installation webhook
 * This simulates what happens when someone installs your app
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env.development.local' });
config({ path: '.env' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function simulateAppInstallation() {
  console.log('🧪 Simulating app installation webhook...');
  
  // This simulates the webhook payload that Whop would send
  const webhookPayload = {
    event: "app.installed",
    data: {
      companyId: "test-company-id", // Replace with a real company ID for testing
      experienceId: "test-experience-id", // Replace with a real experience ID
      appId: "test-app-id" // Replace with a real app ID
    }
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/webhooks/whop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook processed successfully:', result);
      console.log('📦 Resources should now be automatically added to the library!');
    } else {
      console.log('❌ Webhook failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error sending webhook:', error);
  }
}

async function checkResources() {
  console.log('\n🔍 Checking if resources were created...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/resources`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('📋 Current resources:', result);
      
      // Check for app-based resources
      const appResources = result.resources?.filter(r => r.whopAppId) || [];
      console.log(`🎯 App-based resources found: ${appResources.length}`);
      
      if (appResources.length > 0) {
        console.log('✅ SUCCESS: App resources were automatically created!');
        appResources.forEach(resource => {
          console.log(`  - ${resource.name} (${resource.category})`);
        });
      } else {
        console.log('⚠️  No app-based resources found. This could mean:');
        console.log('   1. The webhook wasn\'t triggered');
        console.log('   2. No apps are installed for this company');
        console.log('   3. The sync already happened (one-time only)');
      }
    } else {
      console.log('❌ Failed to fetch resources:', result);
    }
    
  } catch (error) {
    console.error('❌ Error checking resources:', error);
  }
}

async function runTest() {
  console.log('🚀 Testing App Installation Flow');
  console.log('================================');
  
  await simulateAppInstallation();
  await checkResources();
  
  console.log('\n📝 Next Steps:');
  console.log('1. Configure webhook in Whop dashboard');
  console.log('2. Test with real company/experience IDs');
  console.log('3. Install your app to trigger the webhook');
  console.log('4. Check that resources appear in the library');
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { runTest, simulateAppInstallation, checkResources };
