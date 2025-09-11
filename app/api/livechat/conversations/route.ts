import { NextRequest, NextResponse } from "next/server";
import { getConversationList } from "@/lib/actions/livechat-actions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get("experienceId");
    const status = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "newest";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    // Mock user for now - in production this would come from authentication
    const mockUser = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      whopUserId: "550e8400-e29b-41d4-a716-446655440001",
      experienceId: experienceId, // Use the experienceId from URL parameters
      email: "owner@example.com",
      name: "Test Owner",
      credits: 1000,
      accessLevel: "admin" as const,
      experience: {
        id: experienceId, // Use the experienceId from URL parameters
        whopExperienceId: "550e8400-e29b-41d4-a716-446655440003",
        whopCompanyId: "550e8400-e29b-41d4-a716-446655440004",
        name: "Mock Experience",
      },
    };

    const filters = {
      status: status as "all" | "open" | "closed",
      sortBy: sortBy as "newest" | "oldest" | "most_messages" | "least_messages",
      search,
    };

    const pagination = {
      page,
      limit,
    };

    const result = await getConversationList(mockUser, experienceId, filters, pagination);

    return NextResponse.json({
      success: true,
      conversations: result.conversations,
      total: result.total,
      hasMore: result.hasMore,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Error loading conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
