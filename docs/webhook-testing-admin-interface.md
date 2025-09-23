# Webhook Testing Admin Interface

## **Overview**

The webhook testing feature allows admins to test webhook scenarios for products in the OFFER stage of conversations directly from the admin interface. This provides a convenient way to test both affiliate and product owner scenarios with real data from the app installation.

## **Features**

### **1. Admin Interface Integration**
- **Location**: AdminNavbar in CustomerView (admin mode)
- **Access**: Only visible to admin users
- **Trigger**: Click "Test Webhooks" button in expanded admin panel

### **2. Product Detection**
- **Automatic Detection**: Finds all products in OFFER stage blocks
- **Real Data**: Uses actual funnel flow and resource data
- **Product Information**: Shows product name, category, and type

### **3. Scenario Testing**
- **Scenario 1 (Affiliate)**: You get affiliate commission
- **Scenario 2 (Product Owner)**: Other company gets affiliate commission
- **Individual Testing**: Test specific products with specific scenarios
- **Bulk Testing**: Test all products with both scenarios

## **How It Works**

### **1. Product Discovery**
```typescript
// Extract products from OFFER stage blocks
const offerStage = funnelFlow.stages?.find(stage => stage.name === 'OFFER');
offerStage.blockIds?.forEach(blockId => {
  const block = funnelFlow.blocks?.[blockId];
  if (block && block.resourceName) {
    products.push({
      id: blockId,
      name: block.resourceName,
      blockId: blockId,
      resourceName: block.resourceName,
      category: 'PAID',
      type: 'MY_PRODUCTS'
    });
  }
});
```

### **2. Webhook Data Generation**
```typescript
// Scenario 1: You get affiliate commission
const webhookData = {
  action: "payment.succeeded",
  data: {
    id: `pay_test_${productId}_${Date.now()}`,
    company_id: experienceId,
    product_id: productId,
    user_id: `user_test_${Date.now()}`,
    amount: "100.00",
    currency: "usd",
    affiliate_commission: {
      amount: "10.00",
      recipient_company_id: "biz_yourcompany123" // YOUR company
    }
  }
};

// Scenario 2: Other company gets affiliate commission
const webhookData = {
  // ... same structure but
  affiliate_commission: {
    amount: "10.00",
    recipient_company_id: "biz_othercompany456" // OTHER company
  }
};
```

### **3. API Integration**
- **Endpoint**: `/api/admin/webhook-test`
- **Authentication**: Uses Whop auth middleware
- **Processing**: Sends webhook to main webhook handler
- **Response**: Returns test results and webhook data

## **User Interface**

### **1. Webhook Tester Component**
```typescript
<WebhookTester
  conversationId={conversationId}
  experienceId={experienceId}
  funnelFlow={funnelFlow}
  onTestComplete={(result) => {
    console.log('Webhook test completed:', result);
  }}
/>
```

### **2. Product List Display**
- Shows all products in OFFER stage
- Displays product name and category
- Individual test buttons for each scenario
- Bulk test option for all products

### **3. Test Results**
- Real-time test result display
- Success/failure indicators
- Detailed error messages
- Webhook data preview
- Clear results option

## **API Endpoints**

### **POST /api/admin/webhook-test**

**Request Body:**
```json
{
  "productId": "prod_123456",
  "productName": "Premium Course",
  "scenario": "affiliate" | "product_owner"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook test successful",
  "webhookData": { /* webhook payload */ },
  "response": "OK",
  "scenario": "affiliate",
  "productName": "Premium Course"
}
```

## **Configuration**

### **Environment Variables**
```bash
# Required for webhook testing
YOUR_COMPANY_ID=biz_yourcompany123
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Admin Access**
- Only available to admin users (`userType === "admin"`)
- Requires valid Whop authentication
- Needs access to experience and funnel data

## **Testing Scenarios**

### **Scenario 1: You Get Affiliate Commission**
- **Condition**: `affiliate_commission.recipient_company_id === YOUR_COMPANY_ID`
- **Expected**: Analytics updated for product owner
- **Revenue Attribution**: Affiliate revenue tracked

### **Scenario 2: Other Company Gets Affiliate Commission**
- **Condition**: `affiliate_commission.recipient_company_id !== YOUR_COMPANY_ID`
- **Expected**: Analytics updated for you (as seller)
- **Revenue Attribution**: Product revenue tracked

## **Benefits**

### **1. Real Data Testing**
- Uses actual funnel flow data
- Tests with real product information
- Validates with actual experience context

### **2. Convenient Interface**
- No need for external tools
- Integrated with admin workflow
- Real-time feedback

### **3. Comprehensive Testing**
- Tests both scenarios
- Individual and bulk testing
- Detailed result reporting

### **4. Development Support**
- Easy debugging of webhook issues
- Validation of analytics updates
- Testing of scenario detection

## **Usage Instructions**

### **1. Access Webhook Testing**
1. Open CustomerView in admin mode
2. Expand the AdminNavbar
3. Click "Test Webhooks" button

### **2. Test Individual Products**
1. Select a product from the list
2. Click "Test Affiliate" or "Test Product Owner"
3. View results in real-time

### **3. Test All Products**
1. Click "Test All Products" button
2. System tests all products with both scenarios
3. Review comprehensive results

### **4. Clear Results**
1. Click "Clear Results" to reset
2. Start fresh testing session

## **Troubleshooting**

### **Common Issues**

1. **No Products Found**
   - Check if funnel has OFFER stage
   - Verify products are in OFFER blocks
   - Ensure funnel flow is loaded

2. **Webhook Test Fails**
   - Check environment variables
   - Verify webhook endpoint is working
   - Check authentication

3. **Missing Experience Context**
   - Ensure experienceId is available
   - Check Whop authentication
   - Verify admin permissions

### **Debug Steps**

1. Check console logs for errors
2. Verify webhook data structure
3. Test webhook endpoint directly
4. Check environment configuration

## **Future Enhancements**

### **1. Advanced Testing**
- Custom webhook data
- Multiple scenario variations
- Performance testing

### **2. Analytics Integration**
- Real-time analytics updates
- Revenue tracking validation
- Conversion rate testing

### **3. Reporting**
- Test result history
- Performance metrics
- Error tracking

## **Security Considerations**

### **1. Authentication**
- Requires admin access
- Uses Whop authentication
- Validates experience permissions

### **2. Data Protection**
- Test data only
- No real user data
- Secure API endpoints

### **3. Rate Limiting**
- Prevents abuse
- Reasonable test limits
- Error handling

This webhook testing feature provides a powerful tool for admins to validate their analytics system with real data from their app installations, making it easy to test both affiliate and product owner scenarios directly from the admin interface.



