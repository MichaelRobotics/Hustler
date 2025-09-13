import { NextRequest, NextResponse } from "next/server";
import { getLiveChatConversationDetails, sendLiveChatMessage } from "@/lib/actions/livechat-integration-actions";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get("experienceId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    // For LiveChat, we need to get the user from the request headers since it's called from admin panel
    // The user context should already be available from the frontend
    const headersList = await headers();
    const whopUserId = headersList.get("x-on-behalf-of");
    const whopCompanyId = headersList.get("x-company-id");
    
    if (!whopUserId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    // Get user context for the authenticated user
    const { getUserContext } = await import("@/lib/context/user-context");
    const userContext = await getUserContext(
      whopUserId,
      whopCompanyId || "", // Use company ID from header
      experienceId,
      false,
      "admin", // Assume admin access for LiveChat
    );

    if (!userContext?.isAuthenticated || !userContext.user) {
      return NextResponse.json(
        { error: "Failed to get user context" },
        { status: 401 }
      );
    }

    const user = userContext.user;

    // Verify the user has access to the requested experience
    if (user.experienceId !== experienceId) {
      return NextResponse.json(
        { error: "Access denied to experience" },
        { status: 403 }
      );
    }

    const conversation = await getLiveChatConversationDetails(user, conversationId, experienceId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: conversation,
    });
  } catch (error) {
    console.error("Error loading conversation details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const body = await request.json();
    const { action, message, messageType, experienceId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    // For LiveChat, we need to get the user from the request headers since it's called from admin panel
    // The user context should already be available from the frontend
    const headersList = await headers();
    const whopUserId = headersList.get("x-on-behalf-of");
    const whopCompanyId = headersList.get("x-company-id");
    
    if (!whopUserId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    // Get user context for the authenticated user
    const { getUserContext } = await import("@/lib/context/user-context");
    const userContext = await getUserContext(
      whopUserId,
      whopCompanyId || "", // Use company ID from header
      experienceId,
      false,
      "admin", // Assume admin access for LiveChat
    );

    if (!userContext?.isAuthenticated || !userContext.user) {
      return NextResponse.json(
        { error: "Failed to get user context" },
        { status: 401 }
      );
    }

    const user = userContext.user;

    // Verify the user has access to the requested experience
    if (user.experienceId !== experienceId) {
      return NextResponse.json(
        { error: "Access denied to experience" },
        { status: 403 }
      );
    }

    if (action === "send_message") {
      if (!message) {
        return NextResponse.json(
          { error: "Message is required" },
          { status: 400 }
        );
      }

      const result = await sendLiveChatMessage(user, conversationId, message, experienceId);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
        });
      } else {
        return NextResponse.json(
          { error: result.error || "Failed to send message" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'send_message'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error handling conversation action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
