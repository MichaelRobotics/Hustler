# 🎭 Whop Webhook Setup & Testing Guide

This guide provides comprehensive instructions for setting up, testing, and managing Whop webhooks using the Whop SDK and direct testing methods.

## 📋 Prerequisites

### Environment Variables Required
```bash
# Required for webhook management
NEXT_PUBLIC_WHOP_APP_ID=your_whop_app_id
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id
WHOP_WEBHOOK_SECRET=your_webhook_secret

# Optional but recommended
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_agent_user_id
```

### Required Permissions
- `developer:manage_webhook` - Required for webhook management operations

## 🚀 Quick Start

### 1. Test Your Current Webhook
```bash
# Test with your actual webhook secret
WHOP_WEBHOOK_SECRET=your_actual_secret node test-webhook-direct.js
```

### 2. Setup Webhook via SDK
```bash
# Setup webhook for testing
node whop-webhook-manager-simple.js --setup
```

### 3. Run Comprehensive Tests
```bash
# Run full webhook testing suite
node whop-webhook-manager-simple.js --test
```

## 🔧 Webhook Management with SDK

### List Existing Webhooks
```javascript
import { whopSdk } from './lib/whop-sdk';

const result = await whopSdk.webhooks.listWebhooks({
  companyId: "biz_XXXXXXXX"
});

console.log('Webhooks:', result.webhooks);
```

### Create New Webhook
```javascript
const result = await whopSdk.webhooks.createWebhook({
  url: "https://hustler-omega.vercel.app/api/webhooks",
  apiVersion: "v2",
  enabled: true,
  events: [
    "membership.went_valid",
    "payment.succeeded",
    "app_membership.went_valid",
    "app_payment.succeeded"
  ],
  resourceId: "biz_XXXXXXXX"
});

console.log('Created webhook:', result.id);
console.log('Secret:', result.webhookSecret);
```

### Get Webhook Details
```javascript
const result = await whopSdk.webhooks.getWebhook({
  webhookId: "webhook_id_here",
  companyId: "biz_XXXXXXXX"
});

console.log('Webhook details:', result.webhook);
```

### Test Webhook
```javascript
const result = await whopSdk.webhooks.testWebhook({
  id: "webhook_id_here",
  event: "membership.went_valid"
});

console.log('Test result:', result);
```

### Update Webhook
```javascript
const result = await whopSdk.webhooks.updateWebhook({
  id: "webhook_id_here",
  enabled: true,
  events: [
    "membership.went_valid",
    "payment.succeeded"
  ]
});

console.log('Updated webhook:', result);
```

## 🧪 Testing Methods

### Method 1: Direct Testing (Recommended)
```bash
# Test with proper signatures
node test-webhook-direct.js
```

**What it tests:**
- ✅ Webhook endpoint accessibility
- ✅ Signature validation
- ✅ Event processing
- ✅ Response handling

### Method 2: SDK Testing
```bash
# Comprehensive SDK testing
node whop-webhook-manager-simple.js --test
```

**What it tests:**
- ✅ Webhook creation
- ✅ Webhook configuration
- ✅ Event subscription
- ✅ Test event sending

### Method 3: Manual Testing
```bash
# Test with curl
curl -X POST https://hustler-omega.vercel.app/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 📡 Webhook Events

### Supported Events
```javascript
const WEBHOOK_EVENTS = [
  'membership.went_valid',        // User joins membership
  'membership.went_invalid',      // User leaves membership
  'payment.succeeded',            // Payment completed
  'payment.failed',               // Payment failed
  'app_membership.went_valid',    // App membership activated
  'app_membership.went_invalid',  // App membership deactivated
  'app_payment.succeeded',        // App payment completed
  'app_payment.failed'            // App payment failed
];
```

### Event Data Structure
```javascript
// Membership Event
{
  "action": "membership.went_valid",
  "data": {
    "user_id": "user_123456789",
    "product_id": "prod_987654321",
    "page_id": "company_111222333",
    "company_buyer_id": "company_111222333",
    "membership_id": "mem_456789123",
    "plan_id": null,
    "created_at": "2023-10-27T10:00:00Z",
    "status": "active"
  }
}

// Payment Event
{
  "action": "payment.succeeded",
  "data": {
    "id": "pay_789123456",
    "user_id": "user_123456789",
    "product_id": "prod_987654321",
    "company_id": "company_111222333",
    "final_amount": 2999,
    "amount_after_fees": 2849,
    "currency": "USD",
    "status": "succeeded",
    "created_at": "2023-10-27T10:00:00Z",
    "metadata": {
      "type": "subscription",
      "plan_name": "Premium Plan"
    }
  }
}
```

## 🔐 Security & Validation

### Webhook Signature Validation
```javascript
import { makeWebhookValidator } from "@whop/api";

const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
});

// In your webhook handler
const webhook = await validateWebhook(request);
```

### Signature Creation (for testing)
```javascript
const crypto = require('crypto');

function createWebhookSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return hmac.digest('hex');
}

// Usage
const signature = createWebhookSignature(payload, webhookSecret);
const headers = {
  'X-Whop-Signature': `sha256=${signature}`,
  'X-Whop-Timestamp': Math.floor(Date.now() / 1000).toString()
};
```

## 🏢 Multi-Company Support

### Dynamic Company Context
```javascript
// Extract company from webhook data
const companyId = webhookData.data.company_buyer_id || webhookData.data.page_id;

// Create company-specific SDK
const whopSdkWithCompany = whopSdk.withCompany(companyId);

// Use company-specific SDK for API calls
const user = await whopSdkWithCompany.users.getUser({ userId });
```

### Company-Specific Webhook Handling
```javascript
// In your webhook handler
const companyId = webhookData.data.company_buyer_id || webhookData.data.page_id;
const whopSdkWithCompany = whopSdk.withCompany(companyId);

// All subsequent API calls will be scoped to this company
```

## 📊 Monitoring & Debugging

### Vercel Logs
```bash
# Monitor webhook processing
vercel logs --follow

# Filter for webhook logs
vercel logs --follow | grep "WEBHOOK"
```

### Database Verification
```sql
-- Check for new conversations
SELECT * FROM conversations 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check for webhook processing
SELECT * FROM webhook_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Common Issues & Solutions

#### Issue: 401 Invalid webhook signature
**Solution:**
- Verify `WHOP_WEBHOOK_SECRET` matches Whop dashboard
- Check signature generation in test scripts
- Ensure proper headers are sent

#### Issue: Webhooks not triggering
**Solution:**
- Verify webhook is enabled in Whop dashboard
- Check webhook URL is accessible
- Ensure correct events are subscribed
- Verify app is installed on company

#### Issue: Company context errors
**Solution:**
- Use `whopSdk.withCompany(companyId)` for API calls
- Extract company ID from webhook data
- Ensure company has proper permissions

## 🎯 Best Practices

### 1. Webhook Security
- Always validate webhook signatures
- Use HTTPS endpoints only
- Implement rate limiting
- Log all webhook events

### 2. Error Handling
- Return 2xx status codes quickly
- Implement retry logic for failures
- Log errors for debugging
- Handle malformed webhook data

### 3. Performance
- Process webhooks asynchronously
- Use `after()` for long-running operations
- Implement proper timeout handling
- Monitor webhook processing times

### 4. Testing
- Test with real webhook secrets
- Verify all event types
- Test company-specific scenarios
- Monitor production webhook logs

## 📋 Checklist

### Setup Checklist
- [ ] Environment variables configured
- [ ] Webhook endpoint accessible
- [ ] Signature validation working
- [ ] Events subscribed correctly
- [ ] Company permissions verified

### Testing Checklist
- [ ] Direct webhook testing passed
- [ ] SDK webhook management working
- [ ] Event processing verified
- [ ] Database updates confirmed
- [ ] Error handling tested

### Production Checklist
- [ ] Webhook secrets secured
- [ ] Monitoring configured
- [ ] Error alerts set up
- [ ] Performance optimized
- [ ] Documentation updated

## 🚀 Next Steps

1. **Run Tests**: Execute the testing scripts to verify webhook functionality
2. **Monitor Logs**: Watch Vercel logs for webhook processing
3. **Verify Database**: Check that conversations are being created
4. **Test Real Events**: Trigger actual Whop events to test end-to-end flow
5. **Optimize Performance**: Monitor and optimize webhook processing times

## 📞 Support

If you encounter issues:
1. Check Vercel logs for error messages
2. Verify environment variables are set correctly
3. Test webhook endpoint accessibility
4. Verify Whop dashboard webhook configuration
5. Check company permissions and app installation

---

**Happy webhook testing! 🎉**

