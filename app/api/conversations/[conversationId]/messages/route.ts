import { NextRequest, NextResponse } from 'next/server';
import { withResourceProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../../lib/middleware';
import { getMessages, createMessage } from '../../../../../lib/actions/conversation-actions';

/**
 * Conversation Messages API Route
 * Handles message operations for conversations with proper authentication and authorization
 */

/**
 * GET /api/conversations/[conversationId]/messages - Get messages for a conversation
 */
async function getMessagesHandler(context: ProtectedRouteContext) {
  try {
    const conversationId = context.request.nextUrl.pathname.split('/')[3]; // Extract conversationId from path
    const url = new URL(context.request.url);
    
    if (!conversationId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Conversation ID is required'
      );
    }

    // Extract query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Get messages using server action
    const result = await getMessages(context.user, conversationId, page, limit);

    return createSuccessResponse(result, 'Messages retrieved successfully');
  } catch (error) {
    console.error('Error getting messages:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/conversations/[conversationId]/messages - Create a new message
 */
async function createMessageHandler(context: ProtectedRouteContext) {
  try {
    const conversationId = context.request.nextUrl.pathname.split('/')[3]; // Extract conversationId from path
    const input = await context.request.json();
    
    if (!conversationId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Conversation ID is required'
      );
    }

    // Validation
    if (!input.type || !input.content) {
      return createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Message type and content are required'
      );
    }

    if (!['user', 'bot', 'system'].includes(input.type)) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Message type must be user, bot, or system'
      );
    }

    // Create message using server action
    const newMessage = await createMessage(context.user, {
      conversationId,
      type: input.type,
      content: input.content,
      metadata: input.metadata
    });

    return createSuccessResponse(newMessage, 'Message created successfully', 201);
  } catch (error) {
    console.error('Error creating message:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers with resource protection
export const GET = withResourceProtection('conversation', 'customer', getMessagesHandler);
export const POST = withResourceProtection('conversation', 'customer', createMessageHandler);