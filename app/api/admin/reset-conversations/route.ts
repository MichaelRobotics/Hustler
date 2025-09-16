import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, funnelInteractions, experiences } from "@/lib/supabase/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { closeExistingActiveConversationsByWhopUserId } from "@/lib/actions/user-management-actions";
// import { multiTenantDMMonitoringManager } from "@/lib/actions/tenant-dm-monitoring-service"; // DEPRECATED - using cron jobs now
import { validateToken } from "@whop-apps/sdk";
import { headers } from "next/headers";

/**
 * Admin API endpoint to completely reset all conversations for a user
 * This stops DM monitoring, closes active conversations, and cleans up all related data
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const headersList = await headers();
    const { userId: whopUserId } = await validateToken({ headers: headersList });
    
    if (!whopUserId) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    const { experienceId } = await request.json();

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    console.log(`🧹 Admin resetting all conversations for user ${whopUserId} in experience ${experienceId}`);

    // Step 1: Get experience record to get internal experience ID
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 }
      );
    }

    // Step 2: Get all active and completed conversations for this user
    const activeConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.whopUserId, whopUserId),
        eq(conversations.experienceId, experience.id),
        or(
          eq(conversations.status, "active"),
          eq(conversations.status, "completed")
        )
      ),
    });

    console.log(`Found ${activeConversations.length} active/completed conversations to reset`);

    // Step 3: Stop DM monitoring for all active conversations
    for (const conversation of activeConversations) {
      console.log(`🛑 Stopping DM monitoring for conversation ${conversation.id} in experience ${experience.id}`);
      // DM monitoring is now handled by cron jobs - no need to stop monitoring service
      console.log(`Conversation ${conversation.id} reset - cron jobs will handle DM monitoring`);
    }

    // Step 4: Close all active conversations
    console.log("🗑️ Closing all active conversations...");
    const closedCount = await closeExistingActiveConversationsByWhopUserId(whopUserId, experience.id);
    console.log(`Closed ${closedCount} active conversations`);

    // Step 5: Clean up related data (optional - for complete cleanup)
    console.log("🧽 Cleaning up related data...");
    
    // Get all conversations for this user (including completed ones)
    const allConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.whopUserId, whopUserId),
        eq(conversations.experienceId, experience.id)
      ),
    });

    // Clean up messages and funnel interactions for these conversations
    const conversationIds = allConversations.map((conv: any) => conv.id);
    
    if (conversationIds.length > 0) {
      // Delete messages for all conversations
      const deletedMessages = await db
        .delete(messages)
        .where(inArray(messages.conversationId, conversationIds));
      
      // Delete funnel interactions for all conversations
      const deletedInteractions = await db
        .delete(funnelInteractions)
        .where(inArray(funnelInteractions.conversationId, conversationIds));
      
      console.log(`Cleaned up messages and interactions for ${conversationIds.length} conversations`);
    }

    // Step 6: Delete the conversations themselves (optional - for complete reset)
    if (conversationIds.length > 0) {
      console.log("🗑️ Deleting conversation records...");
      const deletedConversations = await db
        .delete(conversations)
        .where(inArray(conversations.id, conversationIds));
      console.log(`Deleted ${conversationIds.length} conversation records`);
    }

    console.log("✅ Complete conversation reset successful!");

    return NextResponse.json({
      success: true,
      message: "All conversations reset successfully",
      data: {
        whopUserId,
        experienceId,
        closedConversations: closedCount,
        deletedConversations: conversationIds.length,
        dmMonitoringStopped: activeConversations.length,
      }
    });

  } catch (error) {
    console.error("Error resetting conversations:", error);
    return NextResponse.json(
      { 
        error: "Failed to reset conversations",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
