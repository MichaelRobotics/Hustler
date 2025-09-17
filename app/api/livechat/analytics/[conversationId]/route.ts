import { NextRequest, NextResponse } from "next/server";
import { getConversationAnalytics } from "@/lib/actions/livechat-actions";

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
      productsSynced: false,
      experience: {
        id: "550e8400-e29b-41d4-a716-446655440002",
        whopExperienceId: "550e8400-e29b-41d4-a716-446655440003",
        whopCompanyId: "550e8400-e29b-41d4-a716-446655440004",
        name: "Mock Experience",
      },
    };

    const result = await getConversationAnalytics(mockUser, conversationId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        analytics: result.analytics,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to load analytics" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error loading analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
