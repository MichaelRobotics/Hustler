/**
 * DM Monitoring API Endpoint (DEPRECATED)
 * 
 * This API is DEPRECATED. DM monitoring is now handled by cron jobs.
 * This endpoint is kept for backward compatibility but does nothing.
 * 
 * @deprecated Use cron-based DM monitoring instead
 */

import { NextRequest, NextResponse } from "next/server";
// import { dmMonitoringService } from "../../../lib/actions/dm-monitoring-actions"; // DEPRECATED - using cron jobs now
import { authenticateWhopUser } from "../../../lib/middleware/whop-auth";

/**
 * GET /api/dm-monitoring
 * Get monitoring status for all conversations
 */
export async function GET(request: NextRequest) {
	// DEPRECATED: DM monitoring is now handled by cron jobs
	return NextResponse.json({
		success: true,
		deprecated: true,
		message: "DM monitoring is now handled by cron jobs. Use /api/health/cron-system for status.",
		data: {
			monitoringStatus: [],
			totalActive: 0,
			totalConversations: 0,
		},
	});
}

/**
 * POST /api/dm-monitoring
 * Start monitoring a conversation
 */
export async function POST(request: NextRequest) {
	// DEPRECATED: DM monitoring is now handled by cron jobs
	return NextResponse.json({
		success: true,
		deprecated: true,
		message: "DM monitoring is now handled by cron jobs. No action needed.",
		data: {
			conversationId: null,
			whopUserId: null,
			isMonitoring: false,
		},
	});
}

/**
 * DELETE /api/dm-monitoring
 * Stop monitoring a conversation
 */
export async function DELETE(request: NextRequest) {
	// DEPRECATED: DM monitoring is now handled by cron jobs
	return NextResponse.json({
		success: true,
		deprecated: true,
		message: "DM monitoring is now handled by cron jobs. No action needed.",
		data: {
			conversationId: null,
			isMonitoring: false,
		},
	});
}

/**
 * PUT /api/dm-monitoring
 * Update monitoring status for a conversation
 */
export async function PUT(request: NextRequest) {
	// DEPRECATED: DM monitoring is now handled by cron jobs
	return NextResponse.json({
		success: true,
		deprecated: true,
		message: "DM monitoring is now handled by cron jobs. No action needed.",
		data: {
			conversationId: null,
			whopUserId: null,
			action: null,
			isMonitoring: false,
		},
	});
}

