# 🔍 Webhook Debugging Guide

## Step 1: Check Environment Variables in Vercel

### In Vercel Dashboard:
1. Go to your project
2. Click "Settings" → "Environment Variables"
3. Verify `WHOP_WEBHOOK_SECRET` is set
4. Make sure it's set for the correct environment (Production/Preview)

### Test Environment Variables:
```bash
# Test your deployed endpoint
curl -X GET https://your-app-domain.vercel.app/api/test-whop-webhook
```

This should return:
```json
{
  "webhookSecretConfigured": true,
  "webhookSecretLength": 32,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Step 2: Check Whop Dashboard Configuration

### Required Webhook Settings:
1. **URL**: `https://your-app-domain.vercel.app/api/webhooks`
2. **Events**: 
   - `membership.went_valid`
   - `payment.succeeded`
3. **Secret**: Must match your `WHOP_WEBHOOK_SECRET`

### How to Configure:
1. Go to [Whop Developer Dashboard](https://whop.com/dashboard/developer)
2. Select your app
3. Go to "Webhooks" section
4. Click "Add Webhook"
5. Set URL and events as above
6. Copy the secret to your Vercel environment variables

## Step 3: Check App Installation

### Critical Requirements:
- ✅ App must be installed on a **company** (not just a user)
- ✅ Someone must **join a product** in that company
- ✅ The company must have your app properly installed

### How to Test:
1. Install your app on a company
2. Have someone join a product in that company
3. Check Vercel logs for webhook events

## Step 4: Test Webhook Endpoint

### Test Basic Connectivity:
```bash
curl -X POST https://your-app-domain.vercel.app/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Test with Whop Validation:
```bash
curl -X POST https://your-app-domain.vercel.app/api/test-whop-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Step 5: Check Vercel Logs

### View Real-time Logs:
```bash
vercel logs --follow
```

### Look for These Logs:
- `🔍 [WEBHOOK DEBUG] Incoming request received`
- `✅ Webhook signature validation passed`
- `[WEBHOOK DEBUG] 🔵 Processing membership.went_valid webhook`

## Common Issues & Solutions

### Issue 1: Environment Variable Not Set
**Symptoms**: Webhook validation fails
**Solution**: Set `WHOP_WEBHOOK_SECRET` in Vercel dashboard

### Issue 2: Wrong Webhook URL
**Symptoms**: No requests received
**Solution**: Use deployed URL, not localhost

### Issue 3: Wrong Events Subscribed
**Symptoms**: Webhooks received but wrong events
**Solution**: Subscribe to `membership.went_valid` and `payment.succeeded`

### Issue 4: App Not Installed on Company
**Symptoms**: No webhooks received
**Solution**: Install app on company, not individual users

### Issue 5: Secret Mismatch
**Symptoms**: Webhook validation fails
**Solution**: Ensure secret in Vercel matches Whop dashboard

## Testing Checklist

- [ ] Environment variables set in Vercel
- [ ] Webhook configured in Whop dashboard
- [ ] App installed on company
- [ ] Webhook endpoint accessible
- [ ] Correct events subscribed
- [ ] Secret matches between Whop and Vercel
- [ ] Someone joins a product in the company
- [ ] Check Vercel logs for webhook events

## Quick Test Commands

```bash
# Test environment variables
curl -X GET https://your-app-domain.vercel.app/api/test-whop-webhook

# Test webhook endpoint
curl -X POST https://your-app-domain.vercel.app/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check logs
vercel logs --follow
```

