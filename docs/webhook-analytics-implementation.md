# Webhook Analytics Implementation

## **Overview**

This implementation provides a comprehensive webhook analytics system that tracks sales data from Whop payment webhooks, updates funnel analytics, and manages product cards for both direct sales and affiliate scenarios.

## **System Architecture**

### **Core Components:**

1. **Scenario Detection System** (`lib/analytics/scenario-detection.ts`)
   - Detects whether you get affiliate commission or not
   - Identifies affiliate vs product owner scenarios
   - Handles error scenarios (no affiliate commission)

2. **Experience Context System** (`lib/analytics/experience-context.ts`)
   - Links webhooks to specific app installations
   - Finds conversations for analytics updates
   - Uses existing multi-tenancy system

3. **Analytics Update System** (`lib/analytics/purchase-tracking.ts`)
   - Updates funnel analytics with scenario-based revenue attribution
   - Handles both affiliate and product owner revenue tracking
   - Maintains backward compatibility with legacy system

4. **Product Card Management** (`lib/analytics/product-card-management.ts`)
   - Creates and updates product cards in sales dashboard
   - Manages resource analytics
   - Handles product card creation for new products

## **Scenario Detection Logic**

### **Scenario 1: You Get Affiliate Commission**
- **Condition**: `affiliate_commission.recipient_company_id === YOUR_COMPANY_ID`
- **Revenue Attribution**: 
  - `affiliateCommission` → Tracked as affiliate revenue
  - `productOwnerRevenue` → Tracked as product revenue
- **Analytics Target**: Product owner's funnel

### **Scenario 2: Other Company Gets Affiliate Commission**
- **Condition**: `affiliate_commission.recipient_company_id !== YOUR_COMPANY_ID`
- **Revenue Attribution**:
  - `affiliateCommission` → Tracked as affiliate revenue (for other company)
  - `productOwnerRevenue` → Tracked as product revenue (for you)
- **Analytics Target**: Your funnel (as seller)

### **Error Scenario: No Affiliate Commission**
- **Condition**: No `affiliate_commission` field in webhook data
- **Action**: Skip analytics update
- **Reason**: Not a direct sale, likely an error

## **Implementation Details**

### **1. Scenario Detection**

```typescript
// Detect scenario from webhook data
const scenarioData = await detectScenario(webhookData);

// Validate scenario data
if (!validateScenarioData(scenarioData)) {
  console.log('Invalid scenario data - skipping analytics');
  return;
}

if (scenarioData.scenario === 'error') {
  console.log('Error scenario detected - skipping analytics');
  return;
}
```

**Note**: The legacy tracking system has been completely removed. Only the enhanced scenario-based analytics system is now active.

### **2. Experience Context**

```typescript
// Get experience context from webhook
const { experience, conversation } = await getExperienceContextFromWebhook(webhookData);

// Validate experience context
if (!validateExperienceContext(experience, conversation)) {
  console.log('Invalid experience context - skipping analytics');
  return;
}
```

### **3. Analytics Updates**

```typescript
// Update analytics with scenario-based revenue attribution
const success = await trackPurchaseConversionWithScenario(
  scenarioData,
  conversation,
  conversation.funnelId
);
```

## **Database Updates**

### **Funnel Analytics Table**
- `totalConversions` - Total number of conversions
- `totalAffiliateRevenue` - Total affiliate commission revenue
- `totalProductRevenue` - Total product sales revenue
- `todayConversions` - Today's conversions
- `todayAffiliateRevenue` - Today's affiliate revenue
- `todayProductRevenue` - Today's product revenue

### **Funnel Resource Analytics Table**
- `totalResourceConversions` - Total conversions for specific product
- `totalResourceRevenue` - Total revenue for specific product
- `todayResourceConversions` - Today's conversions for product
- `todayResourceRevenue` - Today's revenue for product

## **Webhook Integration**

### **Enhanced Webhook Handlers**

1. **`/api/webhooks/route.ts`** - Main webhook handler
   - Handles `payment.succeeded` events
   - Integrates scenario detection and analytics
   - Maintains existing credit pack functionality

2. **`/api/webhooks/whop-purchases/route.ts`** - Purchase webhook handler
   - Handles `plan.purchased`, `access_pass.purchased`, `product.purchased` events
   - Enhanced with scenario detection and analytics
   - **Legacy tracking system removed** - only enhanced analytics active

### **Webhook Processing Flow**

```
1. Webhook Received
   ↓
2. Scenario Detection
   ↓
3. Experience Context Lookup
   ↓
4. Conversation Finding
   ↓
5. Analytics Update
   ↓
6. Product Card Update
```

## **Configuration**

### **Environment Variables**

```bash
# Required
YOUR_COMPANY_ID=biz_yourcompany123
WHOP_WEBHOOK_SECRET=your_webhook_secret

# Optional
NEXT_PUBLIC_WHOP_EXPERIENCE_ID=exp_your_experience_id
```

### **Database Schema**

The system uses existing database tables:
- `funnelAnalytics` - Main analytics table
- `funnelResourceAnalytics` - Resource-specific analytics
- `experiences` - Multi-tenant experience management
- `conversations` - User conversations
- `resources` - Product/resource definitions

## **Testing**

### **Test Script**

Run the test script to validate the implementation:

```bash
node test-webhook-analytics.mjs
```

### **Test Scenarios**

1. **Scenario 1**: You get affiliate commission
2. **Scenario 2**: Other company gets affiliate commission
3. **Error Scenario**: No affiliate commission

### **Mock Data**

The test script includes mock webhook data for all scenarios to validate the system.

## **Monitoring and Logging**

### **Logging Levels**

- `[Scenario Detection]` - Scenario detection logs
- `[Experience Context]` - Experience context logs
- `[Purchase Tracking]` - Analytics update logs
- `[Product Card]` - Product card management logs
- `[Webhook Analytics]` - Webhook processing logs

### **Error Handling**

- Comprehensive error logging
- Validation at each step
- Skip analytics for invalid scenarios
- **No fallback system** - enhanced analytics only

## **Benefits**

### **Revenue Attribution**
- Accurate tracking of affiliate vs product revenue
- Scenario-based revenue attribution
- Product-specific analytics

### **Analytics Dashboard**
- Real-time sales analytics
- Product performance tracking
- Revenue attribution by scenario

### **Scalability**
- Multi-tenant support
- Experience-based analytics
- Conversation-based funnel linking

## **Future Enhancements**

1. **Advanced Analytics**
   - Conversion rate tracking
   - Revenue per product
   - Affiliate performance metrics

2. **Reporting**
   - Automated reports
   - Revenue attribution reports
   - Product performance reports

3. **Integration**
   - Whop API integration
   - External analytics tools
   - Custom dashboards

## **Troubleshooting**

### **Common Issues**

1. **Missing Experience Context**
   - Check if company ID exists in experiences table
   - Verify webhook data includes company_id

2. **Missing Conversation**
   - Check if user has conversation in experience
   - Verify conversation has funnelId

3. **Invalid Scenario Data**
   - Check affiliate commission data
   - Verify YOUR_COMPANY_ID configuration

### **Debug Steps**

1. Check webhook data structure
2. Verify scenario detection
3. Check experience context lookup
4. Validate conversation finding
5. Review analytics updates

## **Support**

For issues or questions:
1. Check logs for error messages
2. Verify configuration
3. Test with mock data
4. Review database state
