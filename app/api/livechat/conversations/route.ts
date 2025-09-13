import { NextRequest, NextResponse } from "next/server";
import { getLiveChatConversations } from "@/lib/actions/livechat-integration-actions";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

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

    const filters = {
      status: status as "all" | "open" | "closed",
      sortBy: sortBy as "newest" | "oldest" | "most_messages" | "least_messages",
      search,
    };

    const pagination = {
      page,
      limit,
    };

    const result = await getLiveChatConversations(user, experienceId, filters, pagination);

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
