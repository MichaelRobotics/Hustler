import { NextRequest, NextResponse } from "next/server";
import { completeDMToInternalTransition } from "@/lib/actions/internal-chat-transition-actions";

/**
 * Complete DM to internal chat transition
 * Public API endpoint for CustomerView to complete transition when user accesses app
 */
export async function POST(request: NextRequest) {
  try {
    const { dmConversationId, funnelId, transitionMessage, whopUserId } = await request.json();

    if (!dmConversationId) {
      return NextResponse.json(
        { error: "DM conversation ID is required" },
        { status: 400 }
      );
    }

    if (!funnelId) {
      return NextResponse.json(
        { error: "Funnel ID is required" },
        { status: 400 }
      );
    }

    if (!whopUserId) {
      return NextResponse.json(
        { error: "Whop user ID is required" },
        { status: 400 }
      );
    }

    console.log(`Completing transition for DM conversation ${dmConversationId}`);

    // Get experience ID from the DM conversation
    const { db } = await import("@/lib/supabase/db-server");
    const { conversations } = await import("@/lib/supabase/schema");
    const { eq } = await import("drizzle-orm");

    const dmConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, dmConversationId),
    });

    if (!dmConversation) {
      return NextResponse.json(
        { error: "DM conversation not found" },
        { status: 404 }
      );
    }

    // Complete the transition
    const internalConversationId = await completeDMToInternalTransition(
      dmConversationId,
      dmConversation.experienceId,
      funnelId,
      transitionMessage || "Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]"
    );

    return NextResponse.json({
      success: true,
      internalConversationId,
      dmConversationId,
      experienceId: dmConversation.experienceId,
    });

  } catch (error) {
    console.error("Error completing transition:", error);
    return NextResponse.json(
      { error: "Failed to complete transition" },
      { status: 500 }
    );
  }
}

