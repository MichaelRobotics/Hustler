import { NextRequest, NextResponse } from "next/server";
import { getAdminAvatarForExperience } from "@/lib/actions/livechat-integration-actions";
import { getUserContext } from "@/lib/context/user-context";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

/**
 * GET /api/experience/[experienceId]/admin-avatar
 * Returns the avatar URL of the admin user for this experience (from users table, same source as user avatar).
 * Caller must be authenticated; typically used by LiveChat to show admin message avatar.
 */
async function getAdminAvatarHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const experienceIndex = pathParts.indexOf("experience");
    const experienceId =
      experienceIndex !== -1 ? pathParts[experienceIndex + 1] : null;

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    const { user } = context;
    if (user.experienceId !== experienceId) {
      return createErrorResponse(
        "ACCESS_DENIED",
        "Experience ID does not match"
      );
    }

    const userContext = await getUserContext(
      user.userId,
      "",
      experienceId,
      false,
      "admin"
    );
    if (!userContext?.isAuthenticated) {
      return createErrorResponse(
        "USER_CONTEXT_NOT_FOUND",
        "User context not found"
      );
    }

    const avatar = await getAdminAvatarForExperience(experienceId);
    return createSuccessResponse({ avatar: avatar ?? null });
  } catch (error) {
    console.error("Error fetching admin avatar:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to fetch admin avatar"
    );
  }
}

export const GET = withWhopAuth(getAdminAvatarHandler);
