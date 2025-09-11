import { NextRequest, NextResponse } from "next/server";
import { loadConversationDetails, sendOwnerMessage, manageConversation } from "@/lib/actions/livechat-actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Mock user for now - in production this would come from authentication
    const mockUser = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      whopUserId: "550e8400-e29b-41d4-a716-446655440001",
      experienceId: "550e8400-e29b-41d4-a716-446655440002",
      email: "owner@example.com",
      name: "Test Owner",
      credits: 1000,
      accessLevel: "admin" as const,
      experience: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        whopExperienceId: "550e8400-e29b-41d4-a716-446655440003",
        whopCompanyId: "550e8400-e29b-41d4-a716-446655440004",
        name: "Mock Experience",
      },
    };

    const conversation = await loadConversationDetails(mockUser, conversationId);

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
    const { action, message, messageType } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Mock user for now - in production this would come from authentication
    const mockUser = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      whopUserId: "550e8400-e29b-41d4-a716-446655440001",
      experienceId: "550e8400-e29b-41d4-a716-446655440002",
      email: "owner@example.com",
      name: "Test Owner",
      credits: 1000,
      accessLevel: "admin" as const,
      experience: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        whopExperienceId: "550e8400-e29b-41d4-a716-446655440003",
        whopCompanyId: "550e8400-e29b-41d4-a716-446655440004",
        name: "Mock Experience",
      },
    };

    if (action === "send_message") {
      if (!message) {
        return NextResponse.json(
          { error: "Message is required" },
          { status: 400 }
        );
      }

      const result = await sendOwnerMessage(mockUser, conversationId, message, mockUser.id);

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
    } else if (action === "manage") {
      const { status, notes } = body;
      const result = await manageConversation(mockUser, conversationId, {
        status,
        notes,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          conversation: result.conversation,
        });
      } else {
        return NextResponse.json(
          { error: result.error || "Failed to manage conversation" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'send_message' or 'manage'" },
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
