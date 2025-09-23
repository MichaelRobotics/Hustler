/**
 * Test Webhook Scenarios for Both Affiliate and Product Owner Cases
 * 
 * This script simulates webhook calls for both scenarios:
 * - Scenario 1: You get affiliate commission
 * - Scenario 2: Other company gets affiliate commission
 */

import fetch from 'node-fetch';

// Your webhook endpoint
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks';
const WHOP_PURCHASES_URL = 'http://localhost:3000/api/webhooks/whop-purchases';

// Test data for both scenarios
const testScenarios = {
  // Scenario 1: You get affiliate commission
  scenario1: {
    action: "payment.succeeded",
    data: {
      id: "pay_test_scenario1_123456789",
      company_id: "biz_testcompany123",
      product_id: "prod_testproduct456",
      user_id: "user_testuser789",
      amount: "100.00",
      currency: "usd",
      created_at: "2024-01-15T10:30:00Z",
      final_amount: "100.00",
      amount_after_fees: "95.00",
      // You get affiliate commission
      affiliate_commission: {
        amount: "10.00",
        recipient_company_id: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || "biz_yourcompany123"
      }
    }
  },

  // Scenario 2: Other company gets affiliate commission
  scenario2: {
    action: "payment.succeeded", 
    data: {
      id: "pay_test_scenario2_987654321",
      company_id: "biz_othercompany456",
      product_id: "prod_otherproduct789",
      user_id: "user_otheruser123",
      amount: "200.00",
      currency: "usd",
      created_at: "2024-01-15T11:45:00Z",
      final_amount: "200.00",
      amount_after_fees: "190.00",
      // Other company gets affiliate commission
      affiliate_commission: {
        amount: "20.00",
        recipient_company_id: "biz_othercompany456"
      }
    }
  },

  // Error scenario: No affiliate commission
  errorScenario: {
    action: "payment.succeeded",
    data: {
      id: "pay_test_error_555666777",
      company_id: "biz_errorcompany789",
      product_id: "prod_errorproduct123",
      user_id: "user_erroruser456",
      amount: "50.00",
      currency: "usd",
      created_at: "2024-01-15T12:00:00Z",
      final_amount: "50.00",
      amount_after_fees: "47.50"
      // No affiliate_commission field
    }
  }
};

/**
 * Send webhook test
 */
async function sendWebhookTest(scenarioName, webhookData) {
  try {
    console.log(`\n🧪 Testing ${scenarioName}...`);
    console.log(`📊 Webhook data:`, JSON.stringify(webhookData, null, 2));

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Bypass': 'true' // Bypass signature validation for testing
      },
      body: JSON.stringify(webhookData)
    });

    const result = await response.text();
    
    if (response.ok) {
      console.log(`✅ ${scenarioName} webhook sent successfully`);
      console.log(`📝 Response: ${result}`);
    } else {
      console.log(`❌ ${scenarioName} webhook failed: ${response.status}`);
      console.log(`📝 Response: ${result}`);
    }

  } catch (error) {
    console.error(`❌ Error sending ${scenarioName} webhook:`, error.message);
  }
}

/**
 * Send whop-purchases webhook test
 */
async function sendWhopPurchasesTest(scenarioName, webhookData) {
  try {
    console.log(`\n🧪 Testing ${scenarioName} (whop-purchases)...`);

    // Convert to whop-purchases format
    const purchaseData = {
      type: "product.purchased",
      data: webhookData.data
    };

    const response = await fetch(WHOP_PURCHASES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Bypass': 'true' // Bypass signature validation for testing
      },
      body: JSON.stringify(purchaseData)
    });

    const result = await response.text();
    
    if (response.ok) {
      console.log(`✅ ${scenarioName} whop-purchases webhook sent successfully`);
      console.log(`📝 Response: ${result}`);
    } else {
      console.log(`❌ ${scenarioName} whop-purchases webhook failed: ${response.status}`);
      console.log(`📝 Response: ${result}`);
    }

  } catch (error) {
    console.error(`❌ Error sending ${scenarioName} whop-purchases webhook:`, error.message);
  }
}

/**
 * Test all scenarios
 */
async function testAllScenarios() {
  console.log('🚀 Starting Webhook Scenario Tests...\n');
  
  // Test main webhook endpoint
  console.log('📡 Testing Main Webhook Endpoint (/api/webhooks/route)');
  await sendWebhookTest('Scenario 1: You get affiliate commission', testScenarios.scenario1);
  await sendWebhookTest('Scenario 2: Other company gets affiliate commission', testScenarios.scenario2);
  await sendWebhookTest('Error Scenario: No affiliate commission', testScenarios.errorScenario);

  // Test whop-purchases endpoint
  console.log('\n📡 Testing Whop-Purchases Endpoint (/api/webhooks/whop-purchases)');
  await sendWhopPurchasesTest('Scenario 1: You get affiliate commission', testScenarios.scenario1);
  await sendWhopPurchasesTest('Scenario 2: Other company gets affiliate commission', testScenarios.scenario2);
  await sendWhopPurchasesTest('Error Scenario: No affiliate commission', testScenarios.errorScenario);

  console.log('\n🎉 All webhook tests completed!');
}

/**
 * Test specific scenario
 */
async function testSpecificScenario(scenarioName) {
  console.log(`🧪 Testing specific scenario: ${scenarioName}\n`);
  
  if (scenarioName === 'scenario1') {
    await sendWebhookTest('Scenario 1: You get affiliate commission', testScenarios.scenario1);
  } else if (scenarioName === 'scenario2') {
    await sendWebhookTest('Scenario 2: Other company gets affiliate commission', testScenarios.scenario2);
  } else if (scenarioName === 'error') {
    await sendWebhookTest('Error Scenario: No affiliate commission', testScenarios.errorScenario);
  } else {
    console.log('❌ Invalid scenario name. Use: scenario1, scenario2, or error');
  }
}

// Run tests based on command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Run all tests
  testAllScenarios().catch(console.error);
} else if (args[0] === 'scenario1' || args[0] === 'scenario2' || args[0] === 'error') {
  // Run specific scenario
  testSpecificScenario(args[0]).catch(console.error);
} else {
  console.log('Usage:');
  console.log('  node test-webhook-scenarios.mjs                    # Test all scenarios');
  console.log('  node test-webhook-scenarios.mjs scenario1        # Test scenario 1 only');
  console.log('  node test-webhook-scenarios.mjs scenario2        # Test scenario 2 only');
  console.log('  node test-webhook-scenarios.mjs error            # Test error scenario only');
}

export { testAllScenarios, testSpecificScenario, testScenarios };

