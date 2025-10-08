import { makeWebhookValidator, type PaymentWebhookData, type MembershipWebhookData } from "@whop/api";
import { after } from "next/server";

if (!process.env.WHOP_WEBHOOK_SECRET) {
  throw new Error("WHOP_WEBHOOK_SECRET environment variable is required");
}

const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
});

export async function POST(request: Request) {
  // Validate the webhook to ensure it's from Whop
  const webhook = await validateWebhook(request);

  // Handle the webhook event
  if (webhook.action === "payment.succeeded") {
    after(handlePaymentSucceededWebhook(webhook.data));
  } else if (webhook.action === "membership.went_valid") {
    console.log("🔵 MEMBERSHIP.WENT_VALID WEBHOOK TRIGGERED!");
    console.log("🔵 Webhook data:", JSON.stringify(webhook.data, null, 2));
    console.log("🔵 Timestamp:", new Date().toISOString());
    console.log("🔵 Action:", webhook.action);
    
    // Log specific fields from membership data
    const membershipData = webhook.data as MembershipWebhookData;
    console.log("🔵 User ID:", membershipData.user_id);
    console.log("🔵 Product ID:", membershipData.product_id);
    console.log("🔵 Plan ID:", membershipData.plan_id);
    console.log("🔵 Company Buyer ID:", membershipData.company_buyer_id);
    console.log("🔵 Page ID:", membershipData.page_id);
    
    // Log any additional fields that might be present
    const additionalFields = Object.keys(membershipData).filter(key => 
      !['user_id', 'product_id', 'plan_id', 'company_buyer_id', 'page_id'].includes(key)
    );
    if (additionalFields.length > 0) {
      console.log("🔵 Additional fields:", additionalFields);
      additionalFields.forEach(field => {
        console.log(`🔵 ${field}:`, (membershipData as any)[field]);
      });
    }
  } else {
    console.log("🔍 Other webhook action:", webhook.action);
    console.log("🔍 Webhook data:", JSON.stringify(webhook.data, null, 2));
  }

  // Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceededWebhook(data: PaymentWebhookData) {
  const { id, user_id, subtotal, amount_after_fees, metadata } = data;
  
  console.log("🟢 PAYMENT.SUCCEEDED WEBHOOK TRIGGERED!");
  console.log("🟢 Payment ID:", id);
  console.log("🟢 User ID:", user_id);
  console.log("🟢 Amount:", subtotal);
  console.log("🟢 Amount after fees:", amount_after_fees);
  console.log("🟢 Metadata:", metadata);
}