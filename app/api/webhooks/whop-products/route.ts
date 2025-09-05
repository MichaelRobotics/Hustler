import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '../../../../lib/middleware/whop-auth';
import { whopProductSync } from '../../../../lib/sync/whop-product-sync';

/**
 * Whop Products Webhook API Route
 * Handles webhook events from Whop for product updates
 */

/**
 * POST /api/webhooks/whop-products - Handle Whop product webhook events
 */
async function handleWhopProductWebhook(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook signature (in production, you'd verify the signature)
    const signature = request.headers.get('x-whop-signature');
    if (!signature) {
      return createErrorResponse(
        'MISSING_SIGNATURE',
        'Webhook signature is required'
      );
    }

    // Handle webhook update - extract company ID from webhook data
    const companyId = body.data?.company_id || body.company_id || 'unknown';
    await whopProductSync.handleWebhookUpdate(companyId, body);

    return createSuccessResponse(
      { received: true, type: body.type },
      'Webhook processed successfully'
    );
  } catch (error) {
    console.error('Error processing Whop product webhook:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the webhook handler (no auth required for webhooks)
export const POST = handleWhopProductWebhook;
