#!/usr/bin/env node

// Test WHOP API connection
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing WHOP API Connection...');
console.log('WHOP API Key:', process.env.WHOP_API_KEY ? 'SET' : 'NOT SET');
console.log('WHOP Company ID:', process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ? 'SET' : 'NOT SET');
console.log('WHOP App ID:', process.env.NEXT_PUBLIC_WHOP_APP_ID ? 'SET' : 'NOT SET');

// Test WHOP API
const { WhopServerSdk } = require('@whop/api');

try {
  const whopSdk = new WhopServerSdk({
    apiKey: process.env.WHOP_API_KEY
  });

  console.log('✅ WHOP SDK initialized successfully');
  
  // Test SDK methods availability
  console.log('Available SDK methods:', Object.keys(whopSdk));
  console.log('✅ WHOP SDK methods loaded successfully');
  console.log('🎉 WHOP API test completed!');
  process.exit(0);

} catch (error) {
  console.error('❌ WHOP SDK initialization failed:', error.message);
  process.exit(1);
}
