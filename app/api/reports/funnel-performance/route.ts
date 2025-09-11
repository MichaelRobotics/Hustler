import { type NextRequest, NextResponse } from "next/server";
import { getUserContext } from "../../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withCustomerAuth,
} from "../../../../lib/middleware/whop-auth";
import { reportingSystem } from "../../../../lib/reporting/reports";

/**
 * Funnel Performance Report API Route
 * Handles funnel performance report generation with proper authentication and authorization
 */

/**
 * GET /api/reports/funnel-performance - Generate funnel performance report
 */
async function generateFunnelPerformanceReportHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const url = new URL(request.url);

		// Extract query parameters
		const startDate = url.searchParams.get("startDate")
			? new Date(url.searchParams.get("startDate")!)
			: undefined;
		const endDate = url.searchParams.get("endDate")
			? new Date(url.searchParams.get("endDate")!)
			: undefined;
		const funnelIds =
			url.searchParams.get("funnelIds")?.split(",") || undefined;
		const format =
			(url.searchParams.get("format") as "json" | "csv" | "pdf") || "json";

		// Use experience ID from URL or fallback to a default
		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 },
			);
		}
		const experienceId = user.experienceId;

		// Get the full user context from the simplified auth (whopCompanyId is now optional)
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			experienceId,
			false, // forceRefresh
			// Don't pass access level - let it be determined from Whop API
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 },
			);
		}

		// Generate the report
		const report = await reportingSystem.generateFunnelPerformanceReport(
			userContext.user,
			{
				startDate,
				endDate,
				funnelIds,
				format,
			},
		);

		// Export in requested format
		if (format !== "json") {
			const exportedData = await reportingSystem.exportReport(report, format);

			return new NextResponse(exportedData, {
				headers: {
					"Content-Type": format === "csv" ? "text/csv" : "application/pdf",
					"Content-Disposition": `attachment; filename="funnel-performance-report.${format}"`,
				},
			});
		}

		return createSuccessResponse(
			report,
			"Funnel performance report generated successfully",
		);
	} catch (error) {
		console.error("Error generating funnel performance report:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handler
export const GET = withCustomerAuth(generateFunnelPerformanceReportHandler);
