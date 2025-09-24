import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { db } from "@/lib/supabase/db-server";
import { resources, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate webhook signature for proper validation
 */
async function generateWebhookSignature(webhookData: any): Promise<string> {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET || "fallback";
  const payload = JSON.stringify(webhookData);
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');
  return `sha256=${signature}`;
}

/**
 * POST /api/admin/webhook-test - Test webhook for specific product
 */
async function testWebhookHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    
    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID required" },
        { status: 400 }
      );
    }

    const { productId, productName, scenario, whopProductId } = await request.json();

    if (!productId || !productName || !scenario) {
      return NextResponse.json(
        { error: "Missing required fields: productId, productName, scenario" },
        { status: 400 }
      );
    }

    // Get real user ID from auth context
    const realUserId = user.userId;
    
    // Fetch actual product ID from resources table
    let actualProductId = whopProductId || productId;
    try {
      // First, get the real experience UUID from the whopExperienceId
      const experience = await db.query.experiences.findFirst({
        where: eq(experiences.whopExperienceId, experienceId)
      });
      
      if (experience) {
        console.log(`[Webhook Test] Found experience UUID: ${experience.id} for whopExperienceId: ${experienceId}`);
        
        // Now query resources with the real experience UUID
        const resource = await db.query.resources.findFirst({
          where: and(
            eq(resources.name, productName),
            eq(resources.experienceId, experience.id) // Use the real UUID
          )
        });
        
        if (resource?.whopProductId) {
          actualProductId = resource.whopProductId;
          console.log(`[Webhook Test] Found real product ID: ${actualProductId} for product: ${productName}`);
        } else {
          console.log(`[Webhook Test] No real product ID found, using fallback: ${actualProductId}`);
        }
      } else {
        console.log(`[Webhook Test] No experience found for whopExperienceId: ${experienceId}`);
      }
    } catch (error) {
      console.error('[Webhook Test] Error fetching product ID:', error);
      // Continue with fallback product ID
    }

    // Create mock webhook data with real user ID and actual product ID
    const webhookData = {
      action: "payment.succeeded",
      data: {
        id: `pay_test_${actualProductId}_${Date.now()}`,
        company_id: experienceId,
        product_id: actualProductId, // Use actual Whop product ID from database
        user_id: realUserId, // Use real user ID from auth context
        amount: "100.00",
        currency: "usd",
        created_at: new Date().toISOString(),
        final_amount: "100.00",
        amount_after_fees: "95.00",
        affiliate_commission: scenario === 'PRODUCT' ? {
          amount: "10.00",
          recipient_company_id: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || "biz_yourcompany123"
        } : {
          amount: "10.00",
          recipient_company_id: "biz_othercompany456"
        }
      }
    };

    // Call the webhook endpoint with proper signature validation
    // Use the current request URL to determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    
    console.log(`[Webhook Test] Using base URL: ${baseUrl}`);
    console.log(`[Webhook Test] Full webhook URL: ${baseUrl}/api/webhooks`);
    
    // Create a proper webhook request with signature validation
    const webhookSignature = await generateWebhookSignature(webhookData);
    console.log(`[Webhook Test] Generated signature: ${webhookSignature.substring(0, 20)}...`);
    
    const webhookRequest = new Request(`${baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Experience-ID': experienceId,
        // Add webhook signature for proper validation
        'X-Whop-Signature': webhookSignature
      },
      body: JSON.stringify(webhookData)
    });
    
    const webhookResponse = await fetch(webhookRequest);
    const webhookResult = await webhookResponse.text();
    
    console.log(`[Webhook Test] Webhook response status: ${webhookResponse.status}`);
    console.log(`[Webhook Test] Webhook response: ${webhookResult}`);

    return NextResponse.json({
      success: webhookResponse.ok,
      message: webhookResponse.ok ? 'Webhook test successful' : 'Webhook test failed',
      webhookData,
      response: webhookResult,
      scenario,
      productName,
      realUserId,
      actualProductId,
      webhookStatus: webhookResponse.status,
      debug: {
        originalProductId: productId,
        foundProductId: actualProductId,
        experienceId,
        userId: realUserId,
        baseUrl,
        webhookUrl: `${baseUrl}/api/webhooks`,
        signatureUsed: webhookSignature.substring(0, 20) + '...'
      }
    });

  } catch (error) {
    console.error("Error testing webhook:", error);
    return NextResponse.json(
      {
        error: "Failed to test webhook",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export const POST = withWhopAuth(testWebhookHandler);

