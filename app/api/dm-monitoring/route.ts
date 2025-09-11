/**
 * DM Monitoring API Endpoint
 * 
 * Provides API endpoints for managing DM monitoring in Phase 2 of the Two-Phase Chat Initiation System.
 * Allows starting, stopping, and checking status of DM monitoring for conversations.
 */

import { NextRequest, NextResponse } from "next/server";
import { dmMonitoringService } from "../../../lib/actions/dm-monitoring-actions";
import { authenticateWhopUser } from "../../../lib/middleware/whop-auth";

/**
 * GET /api/dm-monitoring
 * Get monitoring status for all conversations
 */
export async function GET(request: NextRequest) {
	try {
		// Get authenticated user
		const authContext = await authenticateWhopUser(request);
		if (!authContext?.isAuthenticated) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get monitoring status
		const monitoringStatus = dmMonitoringService.getMonitoringStatus();
		const statusArray = Array.from(monitoringStatus.entries()).map(([conversationId, isActive]) => ({
			conversationId,
			isActive,
		}));

		return NextResponse.json({
			success: true,
			data: {
				monitoringStatus: statusArray,
				totalActive: statusArray.filter(s => s.isActive).length,
				totalConversations: statusArray.length,
			},
		});
	} catch (error) {
		console.error("Error getting DM monitoring status:", error);
		return NextResponse.json(
			{ error: "Failed to get monitoring status" },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/dm-monitoring
 * Start monitoring a conversation
 */
export async function POST(request: NextRequest) {
	try {
		// Get authenticated user
		const authContext = await authenticateWhopUser(request);
		if (!authContext?.isAuthenticated) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Parse request body
		const body = await request.json();
		const { conversationId, whopUserId } = body;

		// Validate required fields
		if (!conversationId || !whopUserId) {
			return NextResponse.json(
				{ error: "Missing required fields: conversationId, whopUserId" },
				{ status: 400 }
			);
		}

		// Start monitoring
		await dmMonitoringService.startMonitoring(conversationId, whopUserId);

		return NextResponse.json({
			success: true,
			message: `Started monitoring conversation ${conversationId}`,
			data: {
				conversationId,
				whopUserId,
				isMonitoring: true,
			},
		});
	} catch (error) {
		console.error("Error starting DM monitoring:", error);
		return NextResponse.json(
			{ error: "Failed to start monitoring" },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/dm-monitoring
 * Stop monitoring a conversation
 */
export async function DELETE(request: NextRequest) {
	try {
		// Get authenticated user
		const authContext = await authenticateWhopUser(request);
		if (!authContext?.isAuthenticated) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Parse request body
		const body = await request.json();
		const { conversationId } = body;

		// Validate required fields
		if (!conversationId) {
			return NextResponse.json(
				{ error: "Missing required field: conversationId" },
				{ status: 400 }
			);
		}

		// Stop monitoring
		await dmMonitoringService.stopMonitoring(conversationId);

		return NextResponse.json({
			success: true,
			message: `Stopped monitoring conversation ${conversationId}`,
			data: {
				conversationId,
				isMonitoring: false,
			},
		});
	} catch (error) {
		console.error("Error stopping DM monitoring:", error);
		return NextResponse.json(
			{ error: "Failed to stop monitoring" },
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/dm-monitoring
 * Update monitoring status for a conversation
 */
export async function PUT(request: NextRequest) {
	try {
		// Get authenticated user
		const authContext = await authenticateWhopUser(request);
		if (!authContext?.isAuthenticated) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Parse request body
		const body = await request.json();
		const { conversationId, whopUserId, action } = body;

		// Validate required fields
		if (!conversationId || !action) {
			return NextResponse.json(
				{ error: "Missing required fields: conversationId, action" },
				{ status: 400 }
			);
		}

		// Handle different actions
		switch (action) {
			case "start":
				if (!whopUserId) {
					return NextResponse.json(
						{ error: "whopUserId required for start action" },
						{ status: 400 }
					);
				}
				await dmMonitoringService.startMonitoring(conversationId, whopUserId);
				break;

			case "stop":
				await dmMonitoringService.stopMonitoring(conversationId);
				break;

			case "restart":
				if (!whopUserId) {
					return NextResponse.json(
						{ error: "whopUserId required for restart action" },
						{ status: 400 }
					);
				}
				await dmMonitoringService.stopMonitoring(conversationId);
				await dmMonitoringService.startMonitoring(conversationId, whopUserId);
				break;

			default:
				return NextResponse.json(
					{ error: "Invalid action. Must be 'start', 'stop', or 'restart'" },
					{ status: 400 }
				);
		}

		const isMonitoring = dmMonitoringService.isMonitoring(conversationId);

		return NextResponse.json({
			success: true,
			message: `${action} action completed for conversation ${conversationId}`,
			data: {
				conversationId,
				whopUserId,
				action,
				isMonitoring,
			},
		});
	} catch (error) {
		console.error("Error updating DM monitoring:", error);
		return NextResponse.json(
			{ error: "Failed to update monitoring" },
			{ status: 500 }
		);
	}
}

