import { NextRequest, NextResponse } from "next/server";
import { loadConversationForUser } from "@/lib/actions/conversation-actions";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Get the conversation to find the correct experience ID
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        experience: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Mock user for now - in production this would come from authentication
    const mockUser = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      whopUserId: "550e8400-e29b-41d4-a716-446655440001",
      experienceId: conversation.experienceId, // Use the actual experience ID from the conversation
      email: "user@example.com",
      name: "Test User",
      credits: 100,
      accessLevel: "customer" as const,
      experience: {
        id: conversation.experienceId,
        whopExperienceId: conversation.experience?.whopExperienceId || "unknown",
        whopCompanyId: conversation.experience?.whopCompanyId || "unknown",
        name: conversation.experience?.name || "Unknown Experience",
      },
    };

    const result = await loadConversationForUser(conversationId, conversation.experienceId);

    // Debug logging for admin testing
    if (result.conversation?.metadata?.type === "admin_triggered") {
      console.log(`Admin conversation loaded successfully:`, {
        conversationId,
        hasFunnelFlow: !!result.funnelFlow
      });
    }

    if (result.success && result.conversation) {
      return NextResponse.json({
        success: true,
        conversation: result.conversation,
        funnelFlow: result.funnelFlow || null,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to load conversation" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error loading conversation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
