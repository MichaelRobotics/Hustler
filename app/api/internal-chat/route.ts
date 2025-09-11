/**
 * Internal Chat API Routes
 * 
 * Handles Phase 4: Transition to Internal Chat
 * Provides endpoints for managing internal chat sessions
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../lib/middleware/whop-auth";
import {
	createInternalChatSession,
	copyDMMessagesToInternalChat,
	initializeFunnel2,
	generateTransitionMessage,
	generateChatLink,
	completeDMToInternalTransition,
} from "../../../lib/actions/internal-chat-transition-actions";
import { db } from "../../../lib/supabase/db-server";
import { conversations, funnels } from "../../../lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { getUserContext } from "../../../lib/context/user-context";

/**
 * GET /api/internal-chat - Get internal chat session details
 */
async function getInternalChatHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const { searchParams } = new URL(request.url);
		const conversationId = searchParams.get("conversationId");

		if (!conversationId) {
			return createErrorResponse(
				"MISSING_CONVERSATION_ID",
				"Conversation ID is required",
			);
		}

		// Validate user has experienceId
		if (!user.experienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"User experience ID is required",
			);
		}

		// Get full user context to access experience.id for database queries
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			user.experienceId,
			false, // forceRefresh
		);

		if (!userContext?.isAuthenticated) {
			return createErrorResponse(
				"USER_NOT_FOUND",
				"User context not found",
			);
		}

		// Get conversation details
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, userContext.user.experience.id),
			),
			with: {
				funnel: true,
				messages: {
					orderBy: [conversations.createdAt],
				},
			},
		});

		if (!conversation) {
			return createErrorResponse(
				"CONVERSATION_NOT_FOUND",
				"Internal chat conversation not found",
			);
		}

		// Check if this is an internal chat
		if (conversation.metadata?.type !== "internal") {
			return createErrorResponse(
				"INVALID_CONVERSATION_TYPE",
				"This is not an internal chat conversation",
			);
		}

		return createSuccessResponse(
			{
				id: conversation.id,
				funnelId: conversation.funnelId,
				status: conversation.status,
				currentBlockId: conversation.currentBlockId,
				userPath: conversation.userPath,
				metadata: conversation.metadata,
				createdAt: conversation.createdAt,
				updatedAt: conversation.updatedAt,
				funnel: {
					id: conversation.funnel.id,
					name: conversation.funnel.name,
					isDeployed: conversation.funnel.isDeployed,
				},
				messages: conversation.messages.map((msg: any) => ({
					id: msg.id,
					type: msg.type,
					content: msg.content,
					metadata: msg.metadata,
					createdAt: msg.createdAt,
				})),
			},
			"Internal chat session retrieved successfully",
		);
	} catch (error) {
		console.error("Error getting internal chat:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * POST /api/internal-chat - Create internal chat session from DM conversation
 */
async function createInternalChatHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const body = await request.json();
		const { dmConversationId, funnelId } = body;

		// Validation
		if (!dmConversationId) {
			return createErrorResponse(
				"MISSING_DM_CONVERSATION_ID",
				"DM conversation ID is required",
			);
		}

		if (!funnelId) {
			return createErrorResponse(
				"MISSING_FUNNEL_ID",
				"Funnel ID is required",
			);
		}

		// Validate user has experienceId
		if (!user.experienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"User experience ID is required",
			);
		}

		// Get full user context to access experience.id for database queries
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			user.experienceId,
			false, // forceRefresh
		);

		if (!userContext?.isAuthenticated) {
			return createErrorResponse(
				"USER_NOT_FOUND",
				"User context not found",
			);
		}

		// Verify DM conversation exists and belongs to user's experience
		const dmConversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, dmConversationId),
				eq(conversations.experienceId, userContext.user.experience.id),
			),
		});

		if (!dmConversation) {
			return createErrorResponse(
				"DM_CONVERSATION_NOT_FOUND",
				"DM conversation not found",
			);
		}

		// Verify funnel exists and belongs to user's experience
		const funnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, userContext.user.experience.id),
			),
		});

		if (!funnel) {
			return createErrorResponse(
				"FUNNEL_NOT_FOUND",
				"Funnel not found",
			);
		}

		// Create internal chat session
		const internalConversationId = await createInternalChatSession(
			dmConversationId,
			user.experienceId,
			funnelId,
		);

		// Copy DM messages to internal chat
		await copyDMMessagesToInternalChat(dmConversationId, internalConversationId);

		// Initialize Funnel 2
		await initializeFunnel2(internalConversationId, funnel.flow);

		return createSuccessResponse(
			{
				internalConversationId,
				dmConversationId,
				funnelId,
			},
			"Internal chat session created successfully",
			201,
		);
	} catch (error) {
		console.error("Error creating internal chat:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * PUT /api/internal-chat - Update internal chat session
 */
async function updateInternalChatHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const body = await request.json();
		const { conversationId, status, currentBlockId, userPath, metadata } = body;

		if (!conversationId) {
			return createErrorResponse(
				"MISSING_CONVERSATION_ID",
				"Conversation ID is required",
			);
		}

		// Validate user has experienceId
		if (!user.experienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"User experience ID is required",
			);
		}

		// Get full user context to access experience.id for database queries
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			user.experienceId,
			false, // forceRefresh
		);

		if (!userContext?.isAuthenticated) {
			return createErrorResponse(
				"USER_NOT_FOUND",
				"User context not found",
			);
		}

		// Verify conversation exists and is an internal chat
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, userContext.user.experience.id),
			),
		});

		if (!conversation) {
			return createErrorResponse(
				"CONVERSATION_NOT_FOUND",
				"Internal chat conversation not found",
			);
		}

		if (conversation.metadata?.type !== "internal") {
			return createErrorResponse(
				"INVALID_CONVERSATION_TYPE",
				"This is not an internal chat conversation",
			);
		}

		// Update conversation
		const [updatedConversation] = await db
			.update(conversations)
			.set({
				status: status || conversation.status,
				currentBlockId: currentBlockId !== undefined ? currentBlockId : conversation.currentBlockId,
				userPath: userPath !== undefined ? userPath : conversation.userPath,
				metadata: metadata !== undefined ? metadata : conversation.metadata,
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId))
			.returning();

		return createSuccessResponse(
			{
				id: updatedConversation.id,
				status: updatedConversation.status,
				currentBlockId: updatedConversation.currentBlockId,
				userPath: updatedConversation.userPath,
				metadata: updatedConversation.metadata,
				updatedAt: updatedConversation.updatedAt,
			},
			"Internal chat session updated successfully",
		);
	} catch (error) {
		console.error("Error updating internal chat:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * POST /api/internal-chat/transition - Complete DM to internal chat transition
 */
async function completeTransitionHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const body = await request.json();
		const { dmConversationId, funnelId, transitionMessage } = body;

		// Validation
		if (!dmConversationId) {
			return createErrorResponse(
				"MISSING_DM_CONVERSATION_ID",
				"DM conversation ID is required",
			);
		}

		if (!funnelId) {
			return createErrorResponse(
				"MISSING_FUNNEL_ID",
				"Funnel ID is required",
			);
		}

		// Validate user has experienceId
		if (!user.experienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"User experience ID is required",
			);
		}

		// Complete the transition
		const internalConversationId = await completeDMToInternalTransition(
			dmConversationId,
			user.experienceId,
			funnelId,
			transitionMessage || "Ready for your Personal Strategy Session! Click the link below to continue.",
		);

		return createSuccessResponse(
			{
				internalConversationId,
				dmConversationId,
				funnelId,
			},
			"DM to internal chat transition completed successfully",
			201,
		);
	} catch (error) {
		console.error("Error completing transition:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * GET /api/internal-chat/link - Generate chat link
 */
async function generateChatLinkHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const { searchParams } = new URL(request.url);
		const conversationId = searchParams.get("conversationId");

		if (!conversationId) {
			return createErrorResponse(
				"MISSING_CONVERSATION_ID",
				"Conversation ID is required",
			);
		}

		// Validate user has experienceId
		if (!user.experienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"User experience ID is required",
			);
		}

		// Get full user context to access experience.id for database queries
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			user.experienceId,
			false, // forceRefresh
		);

		if (!userContext?.isAuthenticated) {
			return createErrorResponse(
				"USER_NOT_FOUND",
				"User context not found",
			);
		}

		// Verify conversation exists and is an internal chat
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, userContext.user.experience.id),
			),
		});

		if (!conversation) {
			return createErrorResponse(
				"CONVERSATION_NOT_FOUND",
				"Internal chat conversation not found",
			);
		}

		if (conversation.metadata?.type !== "internal") {
			return createErrorResponse(
				"INVALID_CONVERSATION_TYPE",
				"This is not an internal chat conversation",
			);
		}

		// Generate chat link
		const chatLink = await generateChatLink(conversationId);

		return createSuccessResponse(
			{
				conversationId,
				chatLink,
			},
			"Chat link generated successfully",
		);
	} catch (error) {
		console.error("Error generating chat link:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handlers
export const GET = withWhopAuth(getInternalChatHandler);
export const POST = withWhopAuth(createInternalChatHandler);
export const PUT = withWhopAuth(updateInternalChatHandler);

// Additional endpoints
async function patchInternalChatHandler(request: NextRequest, context: AuthContext) {
	const { searchParams } = new URL(request.url);
	const action = searchParams.get("action");

	switch (action) {
		case "transition":
			return completeTransitionHandler(request, context);
		case "link":
			return generateChatLinkHandler(request, context);
		default:
			return createErrorResponse(
				"INVALID_ACTION",
				"Invalid action. Use 'transition' or 'link'",
			);
	}
}

export const PATCH = withWhopAuth(patchInternalChatHandler);
