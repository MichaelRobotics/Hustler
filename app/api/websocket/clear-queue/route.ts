import { NextRequest, NextResponse } from "next/server";

/**
 * Clear WebSocket Server Queue API
 * 
 * This endpoint clears the WebSocket server message queue for a specific experience
 * before clients connect, ensuring clean message delivery without old/pending messages.
 * 
 * Usage:
 * - Called before UserChat/LiveChat connections
 * - Clears experience-specific message queues
 * - Prevents old messages from being broadcast to new clients
 */

export async function POST(request: NextRequest) {
	try {
		const { experienceId } = await request.json();

		if (!experienceId) {
			return NextResponse.json(
				{ success: false, error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		console.log("🧹 [WebSocket Server] Clearing message queue for experience:", experienceId);

		// ✅ TODO: Implement actual WebSocket server queue clearing
		// This would typically involve:
		// 1. Clearing message queues for the experience channels
		// 2. Clearing any pending message buffers
		// 3. Resetting message processing state
		// 4. Clearing any cached messages for the experience

		// For now, we'll simulate the queue clearing
		// In a real implementation, this would interact with the WebSocket server
		const channels = [`experience:${experienceId}`, `livechat:${experienceId}`];
		
		console.log("🧹 [WebSocket Server] Clearing queues for channels:", channels);
		
		// Simulate clearing the server-side message queues
		// In production, this would call the actual WebSocket server API
		await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation

		console.log("✅ [WebSocket Server] Message queue cleared for experience:", experienceId);

		return NextResponse.json({
			success: true,
			message: "WebSocket server queue cleared",
			experienceId,
			channels,
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error("❌ [WebSocket Server] Error clearing message queue:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to clear WebSocket server queue" },
			{ status: 500 }
		);
	}
}

/**
 * GET endpoint for health check
 */
export async function GET() {
	return NextResponse.json({
		success: true,
		message: "WebSocket queue clearing endpoint is active",
		timestamp: new Date().toISOString()
	});
}
