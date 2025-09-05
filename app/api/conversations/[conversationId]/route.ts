import { NextRequest, NextResponse } from 'next/server';
import { withResourceProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../lib/middleware';
import { getConversationById, updateConversation, completeConversation, abandonConversation } from '../../../../lib/actions/conversation-actions';

/**
 * Individual Conversation API Route
 * Handles operations on specific conversations with resource-level authorization
 */

/**
 * GET /api/conversations/[conversationId] - Get specific conversation
 */
async function getConversationHandler(context: ProtectedRouteContext) {
  try {
    const conversationId = context.request.nextUrl.pathname.split('/').pop();
    
    if (!conversationId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Conversation ID is required'
      );
    }

    // Get conversation using server action
    const conversation = await getConversationById(context.user, conversationId);

    return createSuccessResponse(conversation, 'Conversation retrieved successfully');
  } catch (error) {
    console.error('Error getting conversation:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * PUT /api/conversations/[conversationId] - Update specific conversation
 */
async function updateConversationHandler(context: ProtectedRouteContext) {
  try {
    const conversationId = context.request.nextUrl.pathname.split('/').pop();
    const input = await context.request.json();
    
    if (!conversationId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Conversation ID is required'
      );
    }

    // Update conversation using server action
    const updatedConversation = await updateConversation(context.user, conversationId, input);

    return createSuccessResponse(updatedConversation, 'Conversation updated successfully');
  } catch (error) {
    console.error('Error updating conversation:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/conversations/[conversationId]/complete - Complete a conversation
 */
async function completeConversationHandler(context: ProtectedRouteContext) {
  try {
    const conversationId = context.request.nextUrl.pathname.split('/')[3]; // Extract conversationId from path
    
    if (!conversationId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Conversation ID is required'
      );
    }

    // Complete conversation using server action
    const completedConversation = await completeConversation(context.user, conversationId);

    return createSuccessResponse(completedConversation, 'Conversation completed successfully');
  } catch (error) {
    console.error('Error completing conversation:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/conversations/[conversationId]/abandon - Abandon a conversation
 */
async function abandonConversationHandler(context: ProtectedRouteContext) {
  try {
    const conversationId = context.request.nextUrl.pathname.split('/')[3]; // Extract conversationId from path
    
    if (!conversationId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Conversation ID is required'
      );
    }

    // Abandon conversation using server action
    const abandonedConversation = await abandonConversation(context.user, conversationId);

    return createSuccessResponse(abandonedConversation, 'Conversation abandoned successfully');
  } catch (error) {
    console.error('Error abandoning conversation:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers with resource protection
export const GET = withResourceProtection('conversation', 'customer', getConversationHandler);
export const PUT = withResourceProtection('conversation', 'customer', updateConversationHandler);
export const POST = withResourceProtection('conversation', 'customer', completeConversationHandler);