# Whop Webhook Configuration for Two-Phase Chat Initiation System

## 🎯 Required Webhook Events

Based on Whop's documentation and the system requirements, you need to configure the following webhook events in your Whop dashboard:

### 1. **Membership Went Valid** ✅ (Primary Event)
- **Event Name:** `membership.went_valid`
- **Purpose:** Triggers when a user gains access to your product/experience
- **Use Case:** This is the main event that initiates the chat funnel system
- **Payload:** Contains `user_id` and `experience_id` (or similar identifiers)

### 2. **Payment Succeeded** ✅ (Already Implemented)
- **Event Name:** `payment.succeeded`
- **Purpose:** Triggers when a payment is successfully processed
- **Use Case:** Already implemented in your system for credit pack purchases
- **Status:** ✅ Already configured and working

### 3. **Payment Failed** (Optional - for error handling)
- **Event Name:** `payment.failed`
- **Purpose:** Triggers when a payment attempt fails
- **Use Case:** Handle users who face payment issues
- **Status:** Optional for Phase 2+ error handling

### 4. **Membership Went Invalid** (Optional - for cleanup)
- **Event Name:** `membership.went_invalid`
- **Purpose:** Triggers when a user loses access to your product
- **Use Case:** Clean up conversations and handle access revocation
- **Status:** Optional for Phase 3+ cleanup handling

## 🔧 Webhook Configuration Steps

### Step 1: Access Whop Dashboard
1. Navigate to your Whop dashboard
2. Go to the "Developer" section
3. Click on "Create webhook" or "Webhooks"

### Step 2: Configure Webhook Endpoint
- **Endpoint URL:** `https://yourdomain.com/api/webhooks`
- **Method:** POST
- **Content-Type:** application/json

### Step 3: Select Events to Monitor
Select the following events:
- ✅ `membership.went_valid` (Primary - for user join detection)
- ✅ `payment.succeeded` (Already implemented)
- ⚠️ `payment.failed` (Optional - for error handling)
- ⚠️ `membership.went_invalid` (Optional - for cleanup)

### Step 4: Security Configuration
- **Webhook Secret:** Generate and store securely
- **Environment Variable:** `WHOP_WEBHOOK_SECRET`
- **Verification:** Already implemented in your webhook handler

## 📋 Webhook Payload Structure

### Membership Went Valid Event:
```json
{
  "action": "membership.went_valid",
  "data": {
    "user_id": "user_123456789",
    "product_id": "prod_123456789",
    "membership_id": "memb_123456789",
    "status": "active",
    "valid": true
  }
}
```

### Payment Succeeded Event (Already Handled):
```json
{
  "action": "payment.succeeded",
  "data": {
    "id": "payment_123456789",
    "user_id": "user_123456789",
    "final_amount": 1000,
    "currency": "usd",
    "metadata": {
      "type": "credit_pack",
      "packId": "pack_123",
      "credits": 10
    }
  }
}
```

## 🔄 Current Implementation Status

### ✅ Already Implemented:
- **Webhook handler** in `app/api/webhooks/route.ts`
- **Payment succeeded** event handling
- **Webhook validation** using `makeWebhookValidator`
- **Async processing** with `waitUntil()`

### 🔧 Needs Update:
Your current webhook handler needs to be updated to handle the `membership.went_valid` event:

```typescript
// Current implementation handles:
if (webhookData.action === "payment.succeeded") {
  // Handle payment events
}

// Add this for membership events:
else if (webhookData.action === "membership.went_valid") {
  const { user_id, product_id } = webhookData.data;
  if (user_id && product_id) {
    waitUntil(handleUserJoinEvent(user_id, product_id));
  }
}
```

## 🚀 Implementation for All Phases

### Phase 1: Webhook + DM Sending ✅
- **Event:** `membership.went_valid`
- **Action:** Send welcome DM and create conversation
- **Status:** Ready to implement

### Phase 2: Message Polling + Response Processing
- **Event:** `membership.went_valid` (already configured)
- **Action:** Poll for DM responses and process user interactions
- **Additional:** May need to poll Whop API for new messages

### Phase 3: Progressive Error Handling + Timeout
- **Events:** `payment.failed`, `membership.went_invalid`
- **Action:** Handle errors and cleanup abandoned conversations
- **Status:** Optional webhook events

### Phase 4-6: Internal Chat Integration
- **Events:** `membership.went_valid` (already configured)
- **Action:** Transition to internal chat system
- **Status:** Uses existing webhook infrastructure

## 🔒 Security Considerations

### Webhook Validation (Already Implemented):
```typescript
const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});
```

### Best Practices:
- ✅ Always validate webhook signatures
- ✅ Use HTTPS endpoints
- ✅ Implement rate limiting
- ✅ Log all webhook events
- ✅ Handle failures gracefully

## 📊 Webhook Monitoring

### Recommended Monitoring:
- **Webhook delivery success rate**
- **Response time to webhook events**
- **Error rates and failure patterns**
- **User join event processing time**

### Logging Structure:
```typescript
console.log(`Membership went valid: User ${user_id} joined experience ${experience_id}`);
console.log(`Processing user join event: ${userId} for experience ${experienceId}`);
```

## 🎯 Summary

### Required Webhook Configuration:
1. **Primary Event:** `membership.went_valid` - Triggers chat initiation
2. **Already Configured:** `payment.succeeded` - For credit purchases
3. **Optional Events:** `payment.failed`, `membership.went_invalid` - For error handling

### Implementation Status:
- ✅ Webhook infrastructure ready
- ✅ Payment events working
- 🔧 Need to add membership event handling
- ✅ Security and validation implemented

### Next Steps:
1. **Configure** `membership.went_valid` webhook in Whop dashboard
2. **Update** webhook handler to process membership events
3. **Test** with real user join events
4. **Monitor** webhook delivery and processing

---

**The webhook configuration is minimal and focused - you only need the `membership.went_valid` event for the core functionality, with optional events for enhanced error handling.**
