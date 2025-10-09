/**
 * Multi-Company Webhook Handler Example
 * 
 * This shows how to handle webhooks from different companies
 * without hardcoding company IDs.
 */

// Example webhook handler that works with any company
export async function handleWebhookFromAnyCompany(webhookData) {
  // Extract company info from webhook data
  const companyId = webhookData.data.company_id || webhookData.data.page_id;
  
  // Use dynamic company context
  const whopSdkWithCompany = whopSdk.withCompany(companyId);
  
  // Now all API calls will be scoped to this company
  const companyInfo = await whopSdkWithCompany.companies.getCompany();
  
  console.log(`Processing webhook for company: ${companyInfo.name}`);
  
  // Your webhook processing logic here...
  return { success: true, companyId };
}

// Environment variables needed:
const REQUIRED_ENV_VARS = {
  // App-level (same for all companies)
  NEXT_PUBLIC_WHOP_APP_ID: "Your app ID from Whop dashboard",
  WHOP_API_KEY: "Your app API key from Whop dashboard", 
  NEXT_PUBLIC_WHOP_AGENT_USER_ID: "Your agent user ID",
  WHOP_WEBHOOK_SECRET: "Your webhook secret",
  
  // Company-level (can be dynamic)
  NEXT_PUBLIC_WHOP_COMPANY_ID: "Optional: Default company ID"
};

console.log("Required environment variables for multi-company webhooks:");
console.log(REQUIRED_ENV_VARS);

