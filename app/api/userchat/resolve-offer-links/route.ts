import { NextRequest, NextResponse } from "next/server";
import { resolveOfferLinkPlaceholders } from "@/lib/actions/simplified-conversation-actions";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

/**
 * Resolve [LINK] placeholders in OFFER stage messages
 * This API endpoint handles link resolution for UserChat messages
 */
async function resolveOfferLinksHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Read request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return createErrorResponse(
        "INVALID_JSON",
        "Invalid JSON in request body"
      );
    }

    // Validate required fields
    if (!requestBody.message) {
      return createErrorResponse(
        "MISSING_MESSAGE",
        "Message is required"
      );
    }

    const { message } = requestBody;

    console.log(`[resolve-offer-links] Resolving links for message:`, message.substring(0, 100));

    // Resolve [LINK] placeholders
    const resolvedMessage = await resolveOfferLinkPlaceholders(message, experienceId);

    console.log(`[resolve-offer-links] Resolved message:`, resolvedMessage.substring(0, 100));

    return createSuccessResponse({
      success: true,
      resolvedMessage,
      originalMessage: message,
    }, "Links resolved successfully");

  } catch (error) {
    console.error("Error resolving offer links:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Failed to resolve links"
    );
  }
}

export const POST = withWhopAuth(resolveOfferLinksHandler);
