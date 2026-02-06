import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, users } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { handleUserJoinEvent } from "@/lib/actions/user-join-actions";
import { findFunnelForTrigger } from "@/lib/helpers/conversation-trigger";
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

    // Step 3: Resolve internal user for membership filter, then find funnel by membership_activated trigger
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.whopUserId, whopUserId),
        eq(users.experienceId, experience.id),
      ),
    });

    const effectiveProductId = productId || "admin-test-product";
    const funnel = await findFunnelForTrigger(experience.id, "membership_activated", {
      userId: user?.id,
      whopUserId,
      productId: effectiveProductId,
    });

    if (!funnel?.flow) {
      return NextResponse.json(
        {
          error: "No funnel configured for this product/membership trigger",
          details: `No funnel with membership_activated trigger found for experience ${experienceId}${productId ? ` and product ${productId}` : ""}. Deploy a funnel with a membership trigger (e.g. any_membership_buy or membership_buy) that matches.`,
        },
        { status: 400 }
      );
    }

    // Step 4: Create simulated webhook data for handleUserJoinEvent
    // Note: page_id should be the company ID (whopCompanyId), not the experience ID
    const simulatedWebhookData: UserJoinWebhookData = {
      user_id: whopUserId,
      product_id: effectiveProductId,
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
      effectiveProductId,
      simulatedWebhookData,
      undefined // membershipId
    );

    console.log(`[ADMIN-DM] Successfully processed admin DM using handleUserJoinEvent for user ${whopUserId}`);

    return NextResponse.json({
      success: true,
      message: "Admin DM processed using handleUserJoinEvent - same flow as real webhooks",
      whopUserId,
      experienceId,
      productId: effectiveProductId,
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