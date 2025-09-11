/**
 * Simple Webhook Test
 * 
 * Tests the webhook endpoint with minimal dependencies
 */

const crypto = require('crypto');

// Test configuration
const TEST_CONFIG = {
    webhookUrl: 'http://localhost:3000/api/webhooks',
    webhookSecret: 'ws_3e601aba43faadeb3cf4b3392fa095d4bda4db035108cd89f93b1ac5ac89ae4a',
    testUserId: 'test-user-' + Date.now(),
    testProductId: 'test-product-' + Date.now(),
};

/**
 * Create a valid webhook signature
 */
function createWebhookSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return hmac.digest('hex');
}

/**
 * Test webhook with valid signature
 */
async function testWebhookWithSignature() {
    console.log('\n🧪 Testing Webhook with Valid Signature...');
    
    try {
        const payload = JSON.stringify({
            action: 'membership.went_valid',
            data: {
                user_id: TEST_CONFIG.testUserId,
                product_id: TEST_CONFIG.testProductId,
                membership_id: 'test-membership-' + Date.now(),
                company_id: 'biz_QG3JlRNIE910HW',
                product: {
                    id: TEST_CONFIG.testProductId,
                    name: 'Test Product',
                    description: 'Test Product for Webhook Testing'
                },
                user: {
                    id: TEST_CONFIG.testUserId,
                    username: 'testuser',
                    email: 'test@example.com'
                }
            },
            timestamp: new Date().toISOString(),
            id: 'webhook-' + Date.now()
        });
        
        const signature = createWebhookSignature(payload, TEST_CONFIG.webhookSecret);
        
        console.log('📤 Sending webhook with signature...');
        console.log('   User ID:', TEST_CONFIG.testUserId);
        console.log('   Product ID:', TEST_CONFIG.testProductId);
        console.log('   Signature:', signature.substring(0, 20) + '...');
        
        const response = await fetch(TEST_CONFIG.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Whop-Signature': signature,
            },
            body: payload
        });
        
        const responseText = await response.text();
        
        console.log(`📥 Response Status: ${response.status}`);
        console.log(`📥 Response Body: ${responseText}`);
        
        if (response.status === 200) {
            console.log('✅ Webhook accepted successfully!');
            return true;
        } else if (response.status === 401) {
            console.log('⚠️  Webhook signature validation failed');
            return false;
        } else {
            console.log(`❌ Webhook returned error: ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Webhook test failed:', error.message);
        return false;
    }
}

/**
 * Test webhook without signature (should fail)
 */
async function testWebhookWithoutSignature() {
    console.log('\n🧪 Testing Webhook without Signature...');
    
    try {
        const payload = JSON.stringify({
            action: 'membership.went_valid',
            data: {
                user_id: TEST_CONFIG.testUserId,
                product_id: TEST_CONFIG.testProductId
            }
        });
        
        const response = await fetch(TEST_CONFIG.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload
        });
        
        console.log(`📥 Response Status: ${response.status}`);
        
        if (response.status === 401) {
            console.log('✅ Webhook properly rejected unsigned request');
            return true;
        } else {
            console.log(`❌ Webhook should have rejected unsigned request, got: ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Webhook test failed:', error.message);
        return false;
    }
}

/**
 * Test webhook with invalid signature
 */
async function testWebhookWithInvalidSignature() {
    console.log('\n🧪 Testing Webhook with Invalid Signature...');
    
    try {
        const payload = JSON.stringify({
            action: 'membership.went_valid',
            data: {
                user_id: TEST_CONFIG.testUserId,
                product_id: TEST_CONFIG.testProductId
            }
        });
        
        const response = await fetch(TEST_CONFIG.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Whop-Signature': 'invalid-signature',
            },
            body: payload
        });
        
        console.log(`📥 Response Status: ${response.status}`);
        
        if (response.status === 401) {
            console.log('✅ Webhook properly rejected invalid signature');
            return true;
        } else {
            console.log(`❌ Webhook should have rejected invalid signature, got: ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Webhook test failed:', error.message);
        return false;
    }
}

/**
 * Run all webhook tests
 */
async function runWebhookTests() {
    console.log('🚀 Starting Simple Webhook Tests\n');
    
    const tests = [
        { name: 'Webhook without Signature', fn: testWebhookWithoutSignature },
        { name: 'Webhook with Invalid Signature', fn: testWebhookWithInvalidSignature },
        { name: 'Webhook with Valid Signature', fn: testWebhookWithSignature },
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passedTests++;
            }
        } catch (error) {
            console.error(`❌ ${test.name} Test CRASHED:`, error);
        }
    }
    
    console.log('\n📊 Webhook Test Results:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All webhook tests PASSED! Webhook is working correctly.');
    } else {
        console.log('\n⚠️  Some webhook tests FAILED. Please review and fix issues.');
    }
    
    return passedTests === totalTests;
}

// Run tests if called directly
if (require.main === module) {
    runWebhookTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { runWebhookTests };
