#!/usr/bin/env node

/**
 * Simulate User Join Scenario
 * 
 * This script simulates a user joining a Whop company where your app is installed.
 * It creates realistic webhook data and sends it to your webhook endpoint.
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = 'https://hustler-omega.vercel.app/api/webhooks';
const WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || 'your-webhook-secret';

// Real company ID from your database where app is installed
const COMPANY_ID = 'biz_st7EmGwWgskri5'; // Trading Options Academy TOA
const EXPERIENCE_ID = 'exp_InBt4VBVq70M11';

// Generate realistic test data
function generateTestData() {
  const timestamp = Math.floor(Date.now() / 1000);
  const membershipId = `mem_${generateRandomId()}`;
  const userId = `user_${generateRandomId()}`;
  const productId = `prod_${generateRandomId()}`;
  const planId = `plan_${generateRandomId()}`;
  
  return {
    action: "membership.went_valid",
    api_version: "v5",
    data: {
      id: membershipId,
      product_id: productId,
      user_id: userId,
      plan_id: planId,
      page_id: COMPANY_ID, // This is the company where your app is installed
      created_at: timestamp,
      expires_at: null,
      renewal_period_start: null,
      renewal_period_end: null,
      quantity: 1,
      status: "completed",
      valid: true,
      cancel_at_period_end: false,
      license_key: `TEST-${generateRandomId().substring(0, 8).toUpperCase()}-${generateRandomId().substring(0, 8).toUpperCase()}-${generateRandomId().substring(0, 5).toUpperCase()}`,
      metadata: {
        test: true,
        simulation: "user-join-scenario"
      },
      checkout_id: `checkout_${generateRandomId()}`,
      affiliate_username: null,
      manage_url: "https://whop.com/@me/settings/orders/",
      company_buyer_id: null,
      marketplace: false,
      acquisition_data: {
        utm_source: "simulation_test",
        utm_medium: "webhook_test"
      },
      custom_field_responses: [],
      entry_custom_field_responses: []
    }
  };
}

function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create webhook signature
function createWebhookSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

// Send webhook with proper signature
async function sendWebhook(webhookData) {
  const payload = JSON.stringify(webhookData);
  const signature = createWebhookSignature(payload, WEBHOOK_SECRET);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Whop-Signature': `sha256=${signature}`,
      'X-Experience-ID': EXPERIENCE_ID, // Add experience ID header
      'User-Agent': 'Whop-Webhook/1.0'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(WEBHOOK_URL, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ Webhook sent successfully!`);
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`📝 Response: ${data}`);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error sending webhook:`, error);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Main simulation function
async function simulateUserJoin() {
  console.log('🚀 Starting User Join Simulation...\n');
  
  console.log('📋 Configuration:');
  console.log(`   Webhook URL: ${WEBHOOK_URL}`);
  console.log(`   Company ID: ${COMPANY_ID}`);
  console.log(`   Experience ID: ${EXPERIENCE_ID}`);
  console.log(`   Webhook Secret: ${WEBHOOK_SECRET ? '✅ Set' : '❌ Not set'}\n`);

  if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'your-webhook-secret') {
    console.error('❌ Please set WHOP_WEBHOOK_SECRET environment variable');
    console.log('   Example: export WHOP_WEBHOOK_SECRET="your-actual-secret"');
    process.exit(1);
  }

  try {
    // Generate test data
    console.log('🎭 Generating test webhook data...');
    const webhookData = generateTestData();
    
    console.log('📦 Webhook Data:');
    console.log(JSON.stringify(webhookData, null, 2));
    console.log('');

    // Send webhook
    console.log('📤 Sending webhook...');
    const result = await sendWebhook(webhookData);
    
    if (result.status === 200) {
      console.log('\n🎉 Simulation completed successfully!');
      console.log('✅ Your webhook handler should have processed the membership.went_valid event');
      console.log('✅ Check your Vercel logs to see the processing details');
    } else {
      console.log(`\n⚠️  Webhook sent but got status ${result.status}`);
    }

  } catch (error) {
    console.error('\n❌ Simulation failed:', error.message);
    process.exit(1);
  }
}

// Run the simulation
if (require.main === module) {
  simulateUserJoin();
}

module.exports = { simulateUserJoin, generateTestData };
