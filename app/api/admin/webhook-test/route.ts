import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { db } from "@/lib/supabase/db-server";
import { resources, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { makeWebhookValidator } from "@whop/api";

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

    // Process webhook data directly using the same logic as /api/webhooks
    console.log(`[Webhook Test] Processing webhook data directly`);
    
    let webhookResponse;
    let webhookResult;
    
    try {
      // Import the webhook processing functions directly
      const { detectScenario, validateScenarioData } = await import('@/lib/analytics/scenario-detection');
      const { getExperienceContextFromWebhook, validateExperienceContext } = await import('@/lib/analytics/experience-context');
      const { trackPurchaseConversionWithScenario } = await import('@/lib/analytics/purchase-tracking');
      
      console.log(`[Webhook Test] Processing payment webhook for user: ${webhookData.data?.user_id}`);
      
      // Extract the data from webhookData.data (same as main webhook route)
      const paymentData = webhookData.data;
      
      // Step 1: Detect scenario (affiliate vs product owner vs error)
      const scenarioData = await detectScenario(paymentData);
      
      if (!validateScenarioData(scenarioData)) {
        console.log(`[Webhook Test] Invalid scenario data - skipping analytics`);
        webhookResponse = { ok: false, status: 400 };
        webhookResult = JSON.stringify({ success: false, error: 'Invalid scenario data' });
      } else if (scenarioData.scenario === 'error') {
        console.log(`[Webhook Test] Error scenario detected - skipping analytics`);
        webhookResponse = { ok: false, status: 400 };
        webhookResult = JSON.stringify({ success: false, error: 'Error scenario detected' });
      } else {
        // Step 2: Get experience context
        const { experience, conversation } = await getExperienceContextFromWebhook(paymentData);
        
        if (!validateExperienceContext(experience, conversation)) {
          console.log(`[Webhook Test] Invalid experience context - skipping analytics`);
          webhookResponse = { ok: false, status: 400 };
          webhookResult = JSON.stringify({ success: false, error: 'Invalid experience context' });
        } else {
          // Step 3: Update analytics with scenario-based revenue attribution
          const success = await trackPurchaseConversionWithScenario(
            scenarioData,
            conversation,
            conversation!.funnelId,
            experience!.experienceId
          );

          if (success) {
            console.log(`[Webhook Test] Successfully updated analytics for scenario: ${scenarioData.scenario}`);
            webhookResponse = { ok: true, status: 200 };
            webhookResult = JSON.stringify({ success: true, message: 'Webhook processed successfully' });
          } else {
            console.log(`[Webhook Test] Failed to update analytics for scenario: ${scenarioData.scenario}`);
            webhookResponse = { ok: false, status: 500 };
            webhookResult = JSON.stringify({ success: false, error: 'Failed to update analytics' });
          }
        }
      }
      
    } catch (error) {
      console.error(`[Webhook Test] Error processing webhook:`, error);
      webhookResponse = { ok: false, status: 500 };
      webhookResult = JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }

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
        processingMethod: 'direct'
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

