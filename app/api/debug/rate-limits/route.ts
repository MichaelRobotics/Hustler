import { NextRequest, NextResponse } from "next/server";
import { rateLimiter, extractTenantIdFromContext } from "@/lib/middleware/rate-limiter";
import { getConnectionStats } from "@/lib/supabase/db-server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";

/**
 * Debug endpoint to check rate limiting and database connection stats
 * Uses proper WHOP authentication and multi-tenancy
 */
async function getRateLimitsHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    
    if (!experienceId) {
      return NextResponse.json({
        error: "Experience ID required",
        message: "User must be authenticated with a valid experience ID"
      }, { status: 400 });
    }

    // Get database connection stats
    const dbStats = await getConnectionStats();
    
    // Get tenant rate limiting stats
    const tenantStats = rateLimiter.getTenantStats(experienceId);
    
    // Test rate limiting
    const testKey = `debug-${Date.now()}`;
    const isAllowed = rateLimiter.isAllowed(experienceId, testKey, 10, 60000); // 10 per minute
    const remaining = rateLimiter.getRemaining(experienceId, testKey, 10, 60000);
    const resetTime = rateLimiter.getResetTime(experienceId, testKey);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tenantId: experienceId,
      database: {
        ...dbStats,
        status: dbStats.health === "healthy" ? "✅ Healthy" : 
                dbStats.health === "warning" ? "⚠️ Warning" : "❌ Critical"
      },
      rateLimiting: {
        tenantStats,
        testResult: {
          key: testKey,
          allowed: isAllowed,
          remaining,
          resetTime: resetTime ? new Date(resetTime).toISOString() : null
        }
      },
      recommendations: {
        database: dbStats.health === "critical" ? 
          "⚠️ Consider upgrading to Vercel Pro for more database connections" : 
          "✅ Database connection pool is healthy",
        rateLimiting: tenantStats.activeKeys > 50 ? 
          "⚠️ High number of active rate limit keys - consider cleanup" : 
          "✅ Rate limiting is operating normally"
      }
    });

  } catch (error) {
    console.error("Error in rate limits debug endpoint:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Export the handler with WHOP authentication
export const GET = withWhopAuth(getRateLimitsHandler);
