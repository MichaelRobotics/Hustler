import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, funnels, funnelAnalytics, users } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { handleUserJoinEvent } from "@/lib/actions/user-join-actions";
import { headers } from "next/headers";
import type { UserJoinWebhookData } from "@/lib/actions/user-join-actions";

/**
 * Admin API endpoint to trigger the first DM using the EXACT SAME FLOW as real customers
 * This sends a real DM using Whop SDK and creates a conversation that appears in LiveChat
 * The admin can then interact with themselves in the LiveChat interface
 */

export async function POST(request: NextRequest) {
  try {
    const { experienceId, productId } = await request.json();

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    // Get the current user's Whop ID using proper authentication
    const headersList = await headers();
    const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);
    
    if (!whopUserId) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    console.log(`[ADMIN-DM] Admin triggering first DM for user ${whopUserId} in experience ${experienceId}${productId ? ` for product ${productId}` : ''}`);

    // Step 1: Get the experience record to get our internal experience ID
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      throw new Error(`Experience not found for whopExperienceId: ${experienceId}`);
    }

    // Step 2: Verify user has access to this Whop experience
    try {
      const userAccess = await whopSdk.access.checkIfUserHasAccessToExperience({
        userId: whopUserId,
        experienceId: experienceId,
      });
      
      if (!userAccess.hasAccess || userAccess.accessLevel !== 'admin') {
        return NextResponse.json(
          { error: "Admin access required for this experience" },
          { status: 403 }
        );
      }
      
      console.log(`[ADMIN-DM] Verified admin access for user ${whopUserId} in experience ${experienceId}`);
    } catch (accessError) {
      console.error(`[ADMIN-DM] Failed to verify user access:`, accessError);
      return NextResponse.json(
        { error: "Failed to verify user access to experience" },
        { status: 403 }
      );
    }

    // Step 3: Find a live (deployed) funnel for this experience - REQUIRED
    const liveFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.experienceId, experience.id),
        eq(funnels.isDeployed, true) // Only use deployed funnels for admin DM triggering
      ),
    });

    if (!liveFunnel) {
      const errorMessage = `No deployed funnel found for experience ${experienceId}. Please deploy a funnel first.`;
        
      return NextResponse.json(
        { 
          error: "No live funnel found",
          details: errorMessage
        },
        { status: 400 }
      );
    }

    if (!liveFunnel.flow) {
      return NextResponse.json(
        { 
          error: "Invalid funnel configuration",
          details: `Funnel ${liveFunnel.id} has no flow. Please create a funnel flow first.`
        },
        { status: 400 }
      );
    }

    // Step 4: Create simulated webhook data for handleUserJoinEvent
    // Note: page_id should be the company ID (whopCompanyId), not the experience ID
    const simulatedWebhookData: UserJoinWebhookData = {
      user_id: whopUserId,
      product_id: productId || "admin-test-product", // Use provided productId or default
      page_id: experience.whopCompanyId, // Use the company ID, not experience ID
      company_buyer_id: undefined, // Admin doesn't have company context
      membership_id: undefined, // Admin doesn't have membership
      plan_id: undefined, // Admin doesn't have plan
    };

    console.log(`[ADMIN-DM] Simulated webhook data:`, simulatedWebhookData);

    // Step 5: Use handleUserJoinEvent to perform ALL the same actions as real webhooks
    // This includes: user creation, conversation creation, DM sending, analytics tracking, etc.
    await handleUserJoinEvent(
      whopUserId,
      productId || "admin-test-product",
      simulatedWebhookData,
      undefined // membershipId
    );

    console.log(`[ADMIN-DM] Successfully processed admin DM using handleUserJoinEvent for user ${whopUserId}`);

    return NextResponse.json({
      success: true,
      message: "Admin DM processed using handleUserJoinEvent - same flow as real webhooks",
      whopUserId,
      experienceId,
      productId: productId || "admin-test-product",
      adminMode: true,
      webhookSimulated: true,
      usedHandleUserJoinEvent: true
    });

  } catch (error) {
    console.error("[ADMIN-DM] Error triggering first DM:", error);
    return NextResponse.json(
      { 
        error: "Failed to trigger first DM",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}