import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels, messages } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { getWelcomeMessage } from "@/lib/actions/user-join-actions";
import { DMMonitoringService } from "@/lib/actions/dm-monitoring-actions";
import { findOrCreateUserForConversation, closeExistingActiveConversationsByWhopUserId } from "@/lib/actions/user-management-actions";
import { headers } from "next/headers";
import type { FunnelFlow } from "@/lib/types/funnel";

/**
 * Admin API endpoint to trigger the first DM using the EXACT SAME FLOW as real customers
 * This sends a real DM using Whop SDK and creates a conversation that appears in LiveChat
 * The admin can then interact with themselves in the LiveChat interface
 */

export async function POST(request: NextRequest) {
  try {
    const { experienceId } = await request.json();

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

    console.log(`Admin triggering first DM for user ${whopUserId} in experience ${experienceId}`);

    // Step 1: Get the experience record to get our internal experience ID
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      throw new Error(`Experience not found for whopExperienceId: ${experienceId}`);
    }

    // Step 2: Find a live funnel for this experience
    const liveFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.experienceId, experience.id),
        eq(funnels.isDeployed, true) // Only use deployed funnels for real DM sending
      ),
    });

    if (!liveFunnel) {
      // If no deployed funnel, try to find any funnel for admin testing
      const anyFunnel = await db.query.funnels.findFirst({
        where: eq(funnels.experienceId, experience.id),
      });

      if (!anyFunnel) {
        throw new Error(`No funnels found for experience ${experienceId}. Please create a funnel first.`);
      }

      if (!anyFunnel.flow) {
        throw new Error(`Funnel ${anyFunnel.id} has no flow. Please create a funnel flow first.`);
      }

      console.log(`Using non-deployed funnel ${anyFunnel.id} for admin testing`);
      
      // For admin testing with non-deployed funnel, create conversation but don't send DM
      const [newConversation] = await db
        .insert(conversations)
        .values({
          experienceId: experience.id,
          funnelId: anyFunnel.id,
          status: "active",
          currentBlockId: anyFunnel.flow.startBlockId,
          userPath: [anyFunnel.flow.startBlockId],
          metadata: {
            type: "admin_triggered",
            phase: "welcome",
            adminUserId: whopUserId,
            whopExperienceId: experienceId,
            createdAt: new Date().toISOString(),
          },
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: "Admin conversation created (no DM sent - funnel not deployed)",
        conversationId: newConversation.id,
        whopUserId,
        experienceId,
        adminMode: true,
        dmSent: false
      });
    }

    // Step 3: Extract welcome message from funnel flow
    const funnelFlow = liveFunnel.flow as FunnelFlow;
    const welcomeMessage = getWelcomeMessage(funnelFlow);
    
    if (!welcomeMessage) {
      throw new Error(`No welcome message found in funnel ${liveFunnel.id}`);
    }

    // Step 4: Send real DM using Whop SDK (EXACT SAME as real customers)
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
      console.log(`DM sending failed for admin user - this is expected for admin testing`);
    }

    // Step 5: Get the member ID from the DM conversation
    let memberId = null;
    if (dmSent) {
      try {
        // Wait a moment for the DM conversation to be created
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the DM conversations to find the new one
        const dmConversations = await whopSdk.messages.listDirectMessageConversations();
        const newConversation = dmConversations.find(conv => 
          conv.feedMembers.some(member => 
            // Look for a conversation where one member is the agent and the other is our user
            member.username === 'tests-agentb2' // Agent username
          ) && conv.lastMessage?.content?.includes('Welcome, [Username]!')
        );
        
        if (newConversation) {
          // Find the member ID for our user (not the agent)
          const userMember = newConversation.feedMembers.find(member => 
            member.username !== 'tests-agentb2'
          );
          if (userMember) {
            memberId = userMember.id;
            console.log(`Found member ID for user ${whopUserId}: ${memberId}`);
          }
        }
      } catch (error) {
        console.error('Error getting member ID:', error);
      }
    }

    // Step 6: Find or create user for conversation binding
    const userId = await findOrCreateUserForConversation(
      whopUserId,
      experience.id,
      {
        name: "Admin User",
        email: "admin@example.com"
      }
    );

    // Step 7: Close any existing active conversations for this admin user
    await closeExistingActiveConversationsByWhopUserId(whopUserId, experience.id);

    // Step 8: Create DM conversation record (EXACT SAME as real customers)
    const [newConversation] = await db
      .insert(conversations)
      .values({
        experienceId: experience.id,
        funnelId: liveFunnel.id,
        userId: userId, // Direct user reference
        whopUserId: whopUserId, // Direct Whop user ID for faster lookups
        status: "active",
        currentBlockId: funnelFlow.startBlockId,
        userPath: [funnelFlow.startBlockId],
        metadata: {
          type: "dm", // Use "dm" type like real customers, not "admin_triggered"
          phase: "welcome",
          whopUserId: whopUserId, // Store as whopUserId like real customers
          whopMemberId: memberId, // Store member ID for DM monitoring
          whopProductId: experienceId,
          adminTriggered: true, // Add flag to identify admin-triggered conversations
          createdAt: new Date().toISOString(),
        },
      })
      .returning();

    const conversationId = newConversation.id;

    // Step 9: Record welcome message in database
    if (dmSent) {
      await db.insert(messages).values({
        conversationId: conversationId,
        type: "bot",
        content: welcomeMessage,
        metadata: {
          blockId: funnelFlow.startBlockId,
          timestamp: new Date().toISOString(),
          dmPhase: true,
          welcomeMessage: true,
          adminTriggered: true,
        },
      });

      console.log(`Recorded welcome message in admin conversation ${conversationId}`);
    }

    console.log(`Successfully created DM conversation for admin. Conversation ID: ${conversationId}, Member ID: ${memberId}`);

    // Step 6: Start DM monitoring (EXACT SAME as customer flow)
    // Admin will experience the same DM response flow as customers
    const dmMonitoringService = new DMMonitoringService();
    await dmMonitoringService.startMonitoring(conversationId, whopUserId);
    
    console.log(`DM monitoring started for admin conversation ${conversationId} with user ${whopUserId}`);

    return NextResponse.json({
      success: true,
      message: dmSent 
        ? "First DM sent successfully and conversation created (EXACT SAME as customer flow)" 
        : "Conversation created (DM sending failed - admin can still test DM responses)",
      conversationId: conversationId,
      whopUserId,
      experienceId,
      adminMode: true,
      dmSent: dmSent,
      welcomeMessage: welcomeMessage,
      monitoringStarted: true
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