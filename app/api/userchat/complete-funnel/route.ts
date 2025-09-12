import { NextRequest, NextResponse } from "next/server";
import { handleFunnelCompletionInUserChat } from "@/lib/actions/simplified-conversation-actions";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { conversationId } = body;

		if (!conversationId) {
			return NextResponse.json(
				{ success: false, error: "Conversation ID is required" },
				{ status: 400 }
			);
		}

		const result = await handleFunnelCompletionInUserChat(conversationId);

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error completing funnel in user chat:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to complete funnel" },
			{ status: 500 }
		);
	}
}