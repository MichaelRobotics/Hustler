import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { getAffiliateCommissionSummary } from "@/lib/analytics/affiliate-tracking";

/**
 * GET /api/analytics/affiliate - Get affiliate commission analytics
 */
async function getAffiliateAnalyticsHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const experienceId = user.experienceId;
		
		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID required" },
				{ status: 400 }
			);
		}

		// Get date range from query parameters
		const { searchParams } = new URL(request.url);
		const startDate = searchParams.get("startDate");
		const endDate = searchParams.get("endDate");

		const start = startDate ? new Date(startDate) : undefined;
		const end = endDate ? new Date(endDate) : undefined;

		console.log(`📊 Getting affiliate analytics for experience ${experienceId}`);

		// Get affiliate commission summary
		const affiliateSummary = await getAffiliateCommissionSummary(
			experienceId,
			start,
			end
		);

		return NextResponse.json({
			success: true,
			affiliateSummary,
			experienceId,
			dateRange: {
				start: start?.toISOString(),
				end: end?.toISOString()
			}
		});

	} catch (error) {
		console.error("Error getting affiliate analytics:", error);
		return NextResponse.json(
			{
				error: "Failed to get affiliate analytics",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

export const GET = withWhopAuth(getAffiliateAnalyticsHandler);
