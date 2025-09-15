import { NextRequest } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { withWhopTenantRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limiter";

/**
 * Example API endpoint with proper multi-tenant rate limiting
 * This demonstrates the correct pattern for using rate limiting with WHOP auth
 */

async function exampleHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    
    if (!experienceId) {
      return Response.json({
        error: "Experience ID required",
        message: "User must be authenticated with a valid experience ID"
      }, { status: 400 });
    }

    // Your business logic here
    const result = {
      message: "Rate limited endpoint working correctly",
      tenantId: experienceId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error in example endpoint:", error);
    return Response.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Apply rate limiting: 30 requests per minute per tenant
const rateLimitedHandler = withWhopTenantRateLimit(
  'example_endpoint', // rate limit key
  RATE_LIMITS.MESSAGE_PROCESSING.limit, // 30 requests
  RATE_LIMITS.MESSAGE_PROCESSING.windowMs, // per minute
  "Too many requests to example endpoint"
);

// Export with both WHOP auth and rate limiting
export const GET = withWhopAuth(rateLimitedHandler(exampleHandler));
export const POST = withWhopAuth(rateLimitedHandler(exampleHandler));
