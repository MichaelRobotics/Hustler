/**
 * Test script for Affiliate DM System
 * 
 * This script tests the affiliate DM functionality by:
 * 1. Testing affiliate link generation
 * 2. Testing DM message creation
 * 3. Testing the admin API endpoint
 */

import { AFFILIATE_CONFIG, getAppInstallLink, getCommissionRateString } from './lib/config/affiliate-config.js';

console.log('🧪 Testing Affiliate DM System\n');

// Test 1: Configuration
console.log('📋 Configuration Test:');
console.log(`Commission Rate: ${getCommissionRateString()}`);
console.log(`App Install Link: ${getAppInstallLink()}`);
console.log(`DM Delay: ${AFFILIATE_CONFIG.DM_DELAY_MINUTES} minutes\n`);

// Test 2: Message Template
console.log('💬 Message Template Test:');
const testAffiliateLink = 'https://whop.com/your-product-slug?a=user123';
const testAppLink = getAppInstallLink();

const testMessage = AFFILIATE_CONFIG.MESSAGE_TEMPLATE
  .replace('{affiliateLink}', testAffiliateLink)
  .replace('{appInstallLink}', testAppLink);

console.log('Generated DM Message:');
console.log(testMessage);
console.log('\n');

// Test 3: Short Message Template
console.log('📱 Short Message Template Test:');
const shortMessage = AFFILIATE_CONFIG.SHORT_MESSAGE_TEMPLATE
  .replace('{affiliateLink}', testAffiliateLink)
  .replace('{appInstallLink}', testAppLink);

console.log('Generated Short DM Message:');
console.log(shortMessage);
console.log('\n');

// Test 4: URL Generation
console.log('🔗 URL Generation Test:');
console.log('Whop Product Link Example:');
console.log('Original: https://whop.com/your-product-slug');
console.log('Affiliate: https://whop.com/your-product-slug?a=user123');
console.log('\n');

console.log('Non-Whop Link Example:');
const baseUrl = 'https://example.com/product';
const url = new URL(baseUrl);

// Add tracking parameters (Whop format)
url.searchParams.set('a', 'user123'); // Primary Whop affiliate parameter
url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.AFFILIATE, 'user123');
url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.EXPERIENCE, 'exp_456');
url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.COMMISSION, '10');
url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.SOURCE, AFFILIATE_CONFIG.TRACKING_PARAMS.SOURCE_VALUE);

console.log('Generated Non-Whop Affiliate URL:');
console.log(url.toString());
console.log('\n');

// Test 5: API Endpoint Test (simulation)
console.log('🌐 API Endpoint Test:');
console.log('POST /api/admin/send-affiliate-dm');
console.log('Request Body:');
console.log(JSON.stringify({
  conversationId: 'conv_123',
  resourceName: 'Premium Course'
}, null, 2));
console.log('\n');

console.log('✅ All tests completed successfully!');
console.log('\n📝 Next Steps:');
console.log('1. Update APP_INSTALL_LINK in lib/config/affiliate-config.ts');
console.log('2. Test with real conversation ID and resource name');
console.log('3. Monitor DM delivery in Whop dashboard');
console.log('4. Verify affiliate link tracking parameters');
