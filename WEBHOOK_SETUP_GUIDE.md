# 🎯 Whop Webhook Setup Guide for Two-Phase Chat Initiation System

## 📋 Required Webhook Events

Based on Whop's official documentation, you need to configure **ONE PRIMARY WEBHOOK EVENT** for the entire system:

### 🚀 **Primary Event (Required):**
- **Event Name:** `membership.went_valid`
- **Purpose:** Triggers when a user gains access to your product/experience
- **Use Case:** Initiates the entire chat funnel system
- **Status:** ✅ Ready to configure

### 💰 **Already Configured:**
- **Event Name:** `payment.succeeded`
- **Purpose:** Handles credit pack purchases
- **Status:** ✅ Already working in your system

### 🔧 **Optional Events (For Enhanced Features):**
- **Event Name:** `payment.failed` - For error handling
- **Event Name:** `membership.went_invalid` - For cleanup
- **Status:** ⚠️ Optional for Phase 3+

## 🔧 Webhook Configuration Steps

### Step 1: Access Whop Dashboard
1. Go to your Whop dashboard
2. Navigate to **Developer** section
3. Click **"Create webhook"** or **"Webhooks"**

### Step 2: Configure Webhook
- **Endpoint URL:** `https://yourdomain.com/api/webhooks`
- **HTTP Method:** POST
- **Content-Type:** application/json

### Step 3: Select Events
**Required:**
- ✅ `membership.went_valid` (Primary event for user join detection)

**Already Working:**
- ✅ `payment.succeeded` (Already configured)

**Optional:**
- ⚠️ `payment.failed` (For error handling)
- ⚠️ `membership.went_invalid` (For cleanup)

### Step 4: Security
- **Webhook Secret:** Generate and store in `WHOP_WEBHOOK_SECRET`
- **Verification:** Already implemented in your code

## 📊 Webhook Payload Structure

### Membership Went Valid Event:
```json
{
  "action": "membership.went_valid",
  "data": {
    "user_id": "user_123456789",
    "experience_id": "exp_123456789",
    "membership_id": "memb_123456789",
    "company_id": "biz_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🔄 System Flow with Webhooks

```
User joins whop → membership.went_valid webhook → 
Live Funnel Detection → Welcome DM → Conversation Created
```

### Phase 1 (Current):
1. **User joins whop** → `membership.went_valid` webhook fires
2. **Webhook processing** → Extracts `user_id` and `experience_id`
3. **Funnel detection** → Finds deployed funnel for experience
4. **DM sending** → Sends welcome message via Whop API
5. **Database tracking** → Creates conversation record

### Future Phases:
- **Phase 2:** Message polling and response processing
- **Phase 3:** Error handling and timeout management
- **Phase 4-6:** Internal chat integration

## ✅ Implementation Status

### Already Working:
- ✅ Webhook infrastructure (`app/api/webhooks/route.ts`)
- ✅ Payment events handling
- ✅ Webhook validation and security
- ✅ Async processing with `waitUntil()`

### Ready to Deploy:
- ✅ Membership event handling implemented
- ✅ User join event processing ready
- ✅ DM sending functionality ready
- ✅ Database tracking ready

## 🚀 Quick Setup Checklist

### In Whop Dashboard:
- [ ] Go to Developer → Webhooks
- [ ] Create new webhook
- [ ] Set endpoint: `https://yourdomain.com/api/webhooks`
- [ ] Select event: `membership.went_valid`
- [ ] Generate webhook secret
- [ ] Save webhook configuration

### In Your Code:
- [x] Webhook handler already implemented
- [x] Membership event processing ready
- [x] Security validation working
- [x] Error handling implemented

### Environment Variables:
- [x] `WHOP_WEBHOOK_SECRET` - For webhook validation
- [x] `WHOP_API_KEY` - For DM sending
- [x] `NEXT_PUBLIC_WHOP_APP_ID` - App identification
- [x] `NEXT_PUBLIC_WHOP_AGENT_USER_ID` - Agent user
- [x] `NEXT_PUBLIC_WHOP_COMPANY_ID` - Company identification

## 🧪 Testing the Webhook

### Test Steps:
1. **Deploy a funnel** with `isDeployed = true`
2. **Create a test user** and join the whop experience
3. **Verify webhook fires** with `membership.went_valid` action
4. **Check DM delivery** to the test user
5. **Verify database record** creation in conversations table

### Expected Logs:
```
Membership went valid: User user_123 joined experience exp_456
Processing user join event: user_123 for experience exp_456
Successfully processed user join for user_123 with funnel funnel_789
```

## 🔒 Security Features

### Already Implemented:
- ✅ Webhook signature validation
- ✅ HTTPS endpoint requirement
- ✅ Async processing to prevent timeouts
- ✅ Comprehensive error handling
- ✅ Multi-tenant data isolation

## 📈 Monitoring & Maintenance

### Key Metrics to Monitor:
- **Webhook delivery success rate**
- **User join event processing time**
- **DM sending success rate**
- **Database record creation success**

### Logging:
- All webhook events are logged with context
- Error handling provides detailed failure information
- User join processing includes timing information

## 🎯 Summary

### What You Need to Do:
1. **Configure ONE webhook event:** `membership.went_valid`
2. **Set the endpoint:** Your existing `/api/webhooks` route
3. **Generate webhook secret:** Store in environment variables
4. **Test with real users:** Join experience and verify flow

### What's Already Working:
- ✅ Complete webhook infrastructure
- ✅ Payment event handling
- ✅ Security and validation
- ✅ User join event processing
- ✅ DM sending functionality
- ✅ Database tracking

### Result:
**One webhook event (`membership.went_valid`) powers the entire Two-Phase Chat Initiation System!**

---

**The webhook configuration is minimal and focused - you only need the `membership.went_valid` event for the core functionality. Everything else is already implemented and ready to go!**
