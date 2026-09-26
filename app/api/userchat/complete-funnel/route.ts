import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/supabase/db-server";
import { conversations } from "@/lib/supabase/schema";
import { requireRequestExperience } from "@/lib/helpers/experience-access-gate";
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

		const access = await requireRequestExperience(request);
		if (!access.ok) return access.response;

		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, access.experience.id),
			),
			columns: { id: true, whopUserId: true },
		});
		if (!conversation || conversation.whopUserId !== access.whopUserId) {
			return NextResponse.json(
				{ success: false, error: "Conversation not found" },
				{ status: 404 },
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
