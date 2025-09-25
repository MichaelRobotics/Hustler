import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels, messages, funnelAnalytics } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { getWelcomeMessage } from "@/lib/actions/user-join-actions";
import { findOrCreateUserForConversation, deleteExistingConversationsByWhopUserId } from "@/lib/actions/user-management-actions";
import { headers } from "next/headers";
import type { FunnelFlow } from "@/lib/types/funnel";

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

    console.log(`Admin triggering first DM for user ${whopUserId} in experience ${experienceId}${productId ? ` for product ${productId}` : ''}`);

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
      
      console.log(`Verified admin access for user ${whopUserId} in experience ${experienceId}`);
    } catch (accessError) {
      console.error(`Failed to verify user access:`, accessError);
      return NextResponse.json(
        { error: "Failed to verify user access to experience" },
        { status: 403 }
      );
    }

    // Step 3: Find a live (deployed) funnel for this experience and product - REQUIRED
    const liveFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.experienceId, experience.id),
        productId ? eq(funnels.whopProductId, productId) : undefined, // Product-specific if provided
        eq(funnels.isDeployed, true) // Only use deployed funnels for admin DM triggering
      ),
    });

    if (!liveFunnel) {
      const errorMessage = productId 
        ? `No deployed funnel found for experience ${experienceId} and product ${productId}. Please deploy a funnel for this product first.`
        : `No deployed funnel found for experience ${experienceId}. Please deploy a funnel first.`;
        
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

    // Step 4: Extract welcome message from funnel flow with personalization
    const funnelFlow = liveFunnel.flow as FunnelFlow;
    const welcomeMessage = getWelcomeMessage(
      funnelFlow, 
      "Admin", // Default name for admin testing (first word only)
      experience.name
    );
    
    if (!welcomeMessage) {
      return NextResponse.json(
        { 
          error: "Invalid funnel configuration",
          details: `No welcome message found in funnel ${liveFunnel.id}. Please check your funnel flow.`
        },
        { status: 400 }
      );
    }

    // Step 5: Send real DM using Whop SDK - REQUIRED for admin
    console.log(`Sending real DM to admin user ${whopUserId}: ${welcomeMessage}`);
    
    let dmSent = false;
    try {
      const dmResult = await whopSdk.messages.sendDirectMessageToUser({
        toUserIdOrUsername: whopUserId,
        message: welcomeMessage,
      });
      
      console.log(`Real DM sent successfully to admin user ${whopUserId}`);
      dmSent = true;
    } catch (dmError) {
      console.error(`Failed to send DM to admin user ${whopUserId}:`, dmError);
      return NextResponse.json(
        { 
          error: "Failed to send DM",
          details: `Could not send DM to user ${whopUserId}. Please check your Whop configuration and try again.`,
          whopError: dmError instanceof Error ? dmError.message : "Unknown Whop error"
        },
        { status: 500 }
      );
    }

    // Step 6: Get the member ID from the DM conversation
    let memberId = null;
    try {
      // Wait a moment for the DM conversation to be created
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the DM conversations to find the new one
      const dmConversations = await whopSdk.messages.listDirectMessageConversations();
      const newConversation = dmConversations.find(conv => 
        // Look for a conversation that contains our welcome message
        conv.lastMessage?.content?.includes('Welcome, [Username]!') ||
        conv.lastMessage?.content?.includes('Welcome!') ||
        conv.lastMessage?.content?.includes('Welcome to')
      );
      
      if (newConversation) {
        // Find the member ID for our user
        // Look for a member that matches our whopUserId
        const userMember = newConversation.feedMembers.find(member => 
          member.id === whopUserId || 
          member.username === whopUserId
        );
        if (userMember) {
          memberId = userMember.id;
          console.log(`Found member ID for user ${whopUserId}: ${memberId}`);
        }
      }
    } catch (error) {
      console.error('Error getting member ID:', error);
      // Continue without member ID - not critical for conversation creation
    }

    // Step 7: Find or create user for conversation binding
    const userId = await findOrCreateUserForConversation(
      whopUserId,
      experience.id,
      {
        name: "Admin User",
        email: "admin@example.com"
      }
    );

    // Step 8: Delete any existing conversations for this admin user
    await deleteExistingConversationsByWhopUserId(whopUserId, experience.id);

    // Step 9: Create DM conversation record (EXACT SAME as real customers)
    const [newConversation] = await db
      .insert(conversations)
      .values({
        experienceId: experience.id,
        funnelId: liveFunnel.id,
        whopUserId: whopUserId, // Direct Whop user ID for faster lookups
        status: "active",
        currentBlockId: funnelFlow.startBlockId,
        userPath: [funnelFlow.startBlockId],
      })
      .returning();

    const conversationId = newConversation.id;

    // Step 10: Record welcome message in database (DM was sent successfully)
    await db.insert(messages).values({
      conversationId: conversationId,
      type: "bot",
      content: welcomeMessage,
    });

    // Increment sends counter for the funnel
    try {
      await db.update(funnels)
        .set({ 
          sends: sql`${funnels.sends} + 1`,
          updatedAt: new Date()
        })
        .where(eq(funnels.id, liveFunnel.id));
      
      console.log(`[trigger-first-dm] Incremented sends counter for funnel ${liveFunnel.id}`);
    } catch (sendsError) {
      console.error(`[trigger-first-dm] Error updating sends counter:`, sendsError);
    }

    console.log(`Recorded welcome message in admin conversation ${conversationId}`);

    // Step 11: Increment Awareness metric (totalStarts) in funnel analytics
    try {
      const today = new Date();
      const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
      };

      // Update or create funnel analytics record
      const existingAnalytics = await db.query.funnelAnalytics.findFirst({
        where: and(
          eq(funnelAnalytics.funnelId, liveFunnel.id),
          eq(funnelAnalytics.experienceId, experience.id)
        ),
      });

      if (existingAnalytics) {
        // Update existing record
        await db.update(funnelAnalytics)
          .set({
            totalStarts: sql`${funnelAnalytics.totalStarts} + 1`,
            todayStarts: isToday(today) ? sql`${funnelAnalytics.todayStarts} + 1` : funnelAnalytics.todayStarts,
            lastUpdated: new Date()
          })
          .where(eq(funnelAnalytics.id, existingAnalytics.id));
        
        console.log(`Updated funnel analytics - incremented totalStarts for funnel ${liveFunnel.id}`);
      } else {
        // Create new record
        await db.insert(funnelAnalytics).values({
          funnelId: liveFunnel.id,
          experienceId: experience.id,
          totalStarts: 1,
          totalInterest: 0,
          totalIntent: 0,
          totalConversions: 0,
          totalProductRevenue: "0",
          totalAffiliateRevenue: "0",
          todayStarts: 1,
          todayInterest: 0,
          todayIntent: 0,
          todayConversions: 0,
          todayProductRevenue: "0",
          todayAffiliateRevenue: "0",
          startsGrowthPercent: 0,
          intentGrowthPercent: 0,
          conversionsGrowthPercent: 0,
          interestGrowthPercent: 0,
          lastUpdated: new Date()
        });
        
        console.log(`Created new funnel analytics record for funnel ${liveFunnel.id}`);
      }
    } catch (analyticsError) {
      console.error('Error updating funnel analytics:', analyticsError);
      // Don't fail the entire operation if analytics update fails
    }

    console.log(`Successfully created DM conversation for admin. Conversation ID: ${conversationId}, Member ID: ${memberId}`);

    // Step 12: Start DM monitoring (EXACT SAME as customer flow)
    // Admin will experience the same DM response flow as customers
    // DM monitoring is now handled by cron jobs - no need to start monitoring service
    // The cron jobs will automatically detect and process this conversation
    console.log(`Conversation ${conversationId} created - cron jobs will handle DM monitoring`);
    
    console.log(`DM monitoring started for admin conversation ${conversationId} with user ${whopUserId} in experience ${experience.id}`);

    return NextResponse.json({
      success: true,
      message: "Admin DM sent successfully, conversation created, and Awareness metric incremented",
      conversationId: conversationId,
      whopUserId,
      experienceId,
      productId: productId || null,
      adminMode: true,
      dmSent: true, // Always true now since we require DM sending
      welcomeMessage: welcomeMessage,
      monitoringStarted: true,
      analyticsUpdated: true // Indicates that the Awareness metric was incremented
    });

  } catch (error) {
    console.error("Error triggering first DM:", error);
    return NextResponse.json(
      { 
        error: "Failed to trigger first DM",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}