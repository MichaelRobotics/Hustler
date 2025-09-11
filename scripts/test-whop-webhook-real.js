/**
 * Real Whop Webhook Test
 * 
 * Tests the webhook endpoint with the actual Whop webhook format
 * Uses the real webhook URL and secret from Whop UI
 */

const crypto = require('crypto');

// Real Whop configuration from your setup
const WHOP_CONFIG = {
    webhookUrl: 'https://hustler-omega.vercel.app/api/webhooks',
    webhookSecret: 'ws_3e601aba43faadeb3cf4b3392fa095d4bda4db035108cd89f93b1ac5ac89ae4a',
    testUserId: 'test-user-' + Date.now(),
    testProductId: 'test-product-' + Date.now(),
};

/**
 * Create a valid Whop webhook signature
 * Whop uses HMAC-SHA256 with the webhook secret
 */
function createWhopWebhookSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return `sha256=${hmac.digest('hex')}`;
}

/**
 * Test webhook with proper Whop signature format
 */
async function testWhopWebhookWithSignature() {
    console.log('\n🧪 Testing Whop Webhook with Proper Signature...');
    
    try {
        const payload = JSON.stringify({
            action: 'membership.went_valid',
            data: {
                user_id: WHOP_CONFIG.testUserId,
                product_id: WHOP_CONFIG.testProductId,
                membership_id: 'test-membership-' + Date.now(),
                company_id: 'biz_QG3JlRNIE910HW',
                product: {
                    id: WHOP_CONFIG.testProductId,
                    name: 'Test Product',
                    description: 'Test Product for Webhook Testing'
                },
                user: {
                    id: WHOP_CONFIG.testUserId,
                    username: 'testuser',
                    email: 'test@example.com'
                }
            },
            timestamp: new Date().toISOString(),
            id: 'webhook-' + Date.now()
        });
        
        const signature = createWhopWebhookSignature(payload, WHOP_CONFIG.webhookSecret);
        
        console.log('📤 Sending webhook to production URL...');
        console.log('   URL:', WHOP_CONFIG.webhookUrl);
        console.log('   User ID:', WHOP_CONFIG.testUserId);
        console.log('   Product ID:', WHOP_CONFIG.testProductId);
        console.log('   Signature:', signature.substring(0, 20) + '...');
        
        const response = await fetch(WHOP_CONFIG.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Whop-Signature': signature,
                'User-Agent': 'Whop-Webhook/1.0',
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
 * Test webhook with local development server
 */
async function testLocalWebhookWithSignature() {
    console.log('\n🧪 Testing Local Webhook with Proper Signature...');
    
    try {
        const payload = JSON.stringify({
            action: 'membership.went_valid',
            data: {
                user_id: WHOP_CONFIG.testUserId,
                product_id: WHOP_CONFIG.testProductId,
                membership_id: 'test-membership-' + Date.now(),
                company_id: 'biz_QG3JlRNIE910HW',
                product: {
                    id: WHOP_CONFIG.testProductId,
                    name: 'Test Product',
                    description: 'Test Product for Webhook Testing'
                },
                user: {
                    id: WHOP_CONFIG.testUserId,
                    username: 'testuser',
                    email: 'test@example.com'
                }
            },
            timestamp: new Date().toISOString(),
            id: 'webhook-' + Date.now()
        });
        
        const signature = createWhopWebhookSignature(payload, WHOP_CONFIG.webhookSecret);
        
        console.log('📤 Sending webhook to local development server...');
        console.log('   URL: http://localhost:3000/api/webhooks');
        console.log('   User ID:', WHOP_CONFIG.testUserId);
        console.log('   Product ID:', WHOP_CONFIG.testProductId);
        console.log('   Signature:', signature.substring(0, 20) + '...');
        
        const response = await fetch('http://localhost:3000/api/webhooks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Whop-Signature': signature,
                'User-Agent': 'Whop-Webhook/1.0',
            },
            body: payload
        });
        
        const responseText = await response.text();
        
        console.log(`📥 Response Status: ${response.status}`);
        console.log(`📥 Response Body: ${responseText}`);
        
        if (response.status === 200) {
            console.log('✅ Local webhook accepted successfully!');
            return true;
        } else if (response.status === 401) {
            console.log('⚠️  Local webhook signature validation failed');
            return false;
        } else {
            console.log(`❌ Local webhook returned error: ${response.status}`);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Local webhook test failed:', error.message);
        return false;
    }
}

/**
 * Test webhook without signature (should fail)
 */
async function testWebhookWithoutSignature() {
    console.log('\n🧪 Testing Webhook without Signature (should fail)...');
    
    try {
        const payload = JSON.stringify({
            action: 'membership.went_valid',
            data: {
                user_id: WHOP_CONFIG.testUserId,
                product_id: WHOP_CONFIG.testProductId
            }
        });
        
        const response = await fetch(WHOP_CONFIG.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload
        });
        
        console.log(`📥 Response Status: ${response.status}`);
        
        if (response.status === 401 || response.status === 400) {
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
 * Test webhook with invalid signature (should fail)
 */
async function testWebhookWithInvalidSignature() {
    console.log('\n🧪 Testing Webhook with Invalid Signature (should fail)...');
    
    try {
        const payload = JSON.stringify({
            action: 'membership.went_valid',
            data: {
                user_id: WHOP_CONFIG.testUserId,
                product_id: WHOP_CONFIG.testProductId
            }
        });
        
        const response = await fetch(WHOP_CONFIG.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Whop-Signature': 'sha256=invalid-signature',
            },
            body: payload
        });
        
        console.log(`📥 Response Status: ${response.status}`);
        
        if (response.status === 401 || response.status === 400) {
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
 * Test different webhook actions
 */
async function testDifferentWebhookActions() {
    console.log('\n🧪 Testing Different Webhook Actions...');
    
    const actions = [
        'membership.went_valid',
        'payment.succeeded',
        'user.created'
    ];
    
    let passedTests = 0;
    
    for (const action of actions) {
        try {
            const payload = JSON.stringify({
                action: action,
                data: {
                    user_id: WHOP_CONFIG.testUserId,
                    product_id: WHOP_CONFIG.testProductId,
                    membership_id: 'test-membership-' + Date.now(),
                    company_id: 'biz_QG3JlRNIE910HW'
                },
                timestamp: new Date().toISOString(),
                id: 'webhook-' + Date.now()
            });
            
            const signature = createWhopWebhookSignature(payload, WHOP_CONFIG.webhookSecret);
            
            const response = await fetch(WHOP_CONFIG.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Whop-Signature': signature,
                    'User-Agent': 'Whop-Webhook/1.0',
                },
                body: payload
            });
            
            console.log(`   ${action}: ${response.status}`);
            
            if (response.status === 200) {
                passedTests++;
            }
            
        } catch (error) {
            console.log(`   ${action}: ERROR - ${error.message}`);
        }
    }
    
    if (passedTests === actions.length) {
        console.log('✅ All webhook actions handled correctly');
        return true;
    } else {
        console.log(`⚠️  ${passedTests}/${actions.length} webhook actions handled correctly`);
        return false;
    }
}

/**
 * Run all Whop webhook tests
 */
async function runWhopWebhookTests() {
    console.log('🚀 Starting Real Whop Webhook Tests\n');
    console.log('📋 Configuration:');
    console.log(`   Webhook URL: ${WHOP_CONFIG.webhookUrl}`);
    console.log(`   Webhook Secret: ${WHOP_CONFIG.webhookSecret.substring(0, 20)}...`);
    console.log(`   Test User ID: ${WHOP_CONFIG.testUserId}`);
    console.log(`   Test Product ID: ${WHOP_CONFIG.testProductId}\n`);
    
    const tests = [
        { name: 'Webhook without Signature', fn: testWebhookWithoutSignature },
        { name: 'Webhook with Invalid Signature', fn: testWebhookWithInvalidSignature },
        { name: 'Local Webhook with Valid Signature', fn: testLocalWebhookWithSignature },
        { name: 'Production Webhook with Valid Signature', fn: testWhopWebhookWithSignature },
        { name: 'Different Webhook Actions', fn: testDifferentWebhookActions },
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
    
    console.log('\n📊 Whop Webhook Test Results:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All Whop webhook tests PASSED! Webhook is working correctly.');
    } else if (passedTests >= totalTests * 0.8) {
        console.log('\n✅ Most Whop webhook tests PASSED! Webhook is mostly working.');
    } else {
        console.log('\n⚠️  Some Whop webhook tests FAILED. Please review and fix issues.');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. If local tests pass, the webhook logic is working');
    console.log('2. If production tests pass, the webhook is ready for real Whop events');
    console.log('3. Test with actual user joins in your Whop experience');
    console.log('4. Monitor webhook logs for real events');
    
    return passedTests >= totalTests * 0.8;
}

// Export for use in other scripts
module.exports = {
    runWhopWebhookTests,
    testWhopWebhookWithSignature,
    testLocalWebhookWithSignature,
    testWebhookWithoutSignature,
    testWebhookWithInvalidSignature,
    testDifferentWebhookActions,
};

// Run tests if called directly
if (require.main === module) {
    runWhopWebhookTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}
