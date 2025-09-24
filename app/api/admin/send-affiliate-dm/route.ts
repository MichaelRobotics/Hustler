import { NextRequest, NextResponse } from "next/server";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import { sendAffiliateDM } from "@/lib/utils/affiliate-dm-core";

/**
 * Admin API to manually send affiliate DM to a user
 * This is useful for testing the affiliate DM system
 */
async function sendAffiliateDMHandler(
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
    if (!requestBody.conversationId) {
      return createErrorResponse(
        "MISSING_CONVERSATION_ID",
        "Conversation ID is required"
      );
    }
    
    if (!requestBody.resourceName) {
      return createErrorResponse(
        "MISSING_RESOURCE_NAME",
        "Resource name is required"
      );
    }

    const { conversationId, resourceName } = requestBody;

    console.log(`[Admin] Sending affiliate DM for conversation ${conversationId}, resource: ${resourceName}`);

    // Send affiliate DM
    const result = await sendAffiliateDM(
      conversationId,
      resourceName,
      experienceId
    );

    if (result.success) {
      return createSuccessResponse({
        success: true,
        message: "Affiliate DM sent successfully",
        conversationId,
        resourceName,
      }, "Affiliate DM sent successfully");
    } else {
      return createErrorResponse(
        "AFFILIATE_DM_FAILED",
        result.error || "Failed to send affiliate DM"
      );
    }

  } catch (error) {
    console.error("Error sending affiliate DM:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Failed to send affiliate DM"
    );
  }
}

export const POST = withWhopAuth(sendAffiliateDMHandler);
