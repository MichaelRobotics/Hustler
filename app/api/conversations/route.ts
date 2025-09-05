import { NextRequest, NextResponse } from 'next/server';
import { withCustomerProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../lib/middleware';
import { getConversations, createConversation } from '../../../lib/actions/conversation-actions';

/**
 * Conversations API Route
 * Handles CRUD operations for conversations with proper authentication and authorization
 */

/**
 * GET /api/conversations - List user's conversations
 */
async function getConversationsHandler(context: ProtectedRouteContext) {
  try {
    const { user, request } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;
    const status = url.searchParams.get('status') as 'active' | 'completed' | 'abandoned' | undefined;
    const funnelId = url.searchParams.get('funnelId') || undefined;

    // Get conversations using server action
    const result = await getConversations(user, page, limit, search, status, funnelId);

    return createSuccessResponse(result, 'Conversations retrieved successfully');
  } catch (error) {
    console.error('Error getting conversations:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/conversations - Create a new conversation
 */
async function createConversationHandler(context: ProtectedRouteContext) {
  try {
    const { user, request } = context;
    const input = await request.json();

    // Validation
    if (!input.funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Create conversation using server action
    const newConversation = await createConversation(user, input);

    return createSuccessResponse(newConversation, 'Conversation created successfully', 201);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const GET = withCustomerProtection(getConversationsHandler);
export const POST = withCustomerProtection(createConversationHandler);