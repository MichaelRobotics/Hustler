// Test webhook simulation script
// Run this to simulate a membership.went_valid webhook

const testWebhookData = {
  "action": "membership.went_valid",
  "api_version": "v5",
  "data": {
    "id": "mem_test123",
    "product_id": "prod_test456",
    "user_id": "user_test789",
    "plan_id": "plan_test101",
    "page_id": "biz_st7EmGwWgskri5", // Use a real company ID from your database
    "created_at": Math.floor(Date.now() / 1000),
    "expires_at": null,
    "renewal_period_start": null,
    "renewal_period_end": null,
    "quantity": 1,
    "status": "completed",
    "valid": true,
    "cancel_at_period_end": false,
    "license_key": "TEST-12345-67890-ABCDE",
    "metadata": {},
    "checkout_id": null,
    "affiliate_username": null,
    "manage_url": "https://whop.com/@me/settings/orders/",
    "company_buyer_id": null,
    "marketplace": false,
    "acquisition_data": null,
    "custom_field_responses": [],
    "entry_custom_field_responses": []
  }
};

// Send test webhook to your endpoint
fetch('https://hustler-omega.vercel.app/api/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Note: This won't have proper signature validation
  },
  body: JSON.stringify(testWebhookData)
})
.then(response => response.text())
.then(data => console.log('Test webhook response:', data))
.catch(error => console.error('Test webhook error:', error));
