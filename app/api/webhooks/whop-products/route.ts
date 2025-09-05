import { NextRequest, NextResponse } from 'next/server';
import { whopProductSync } from '../../../../lib/sync/whop-product-sync';

/**
 * WHOP Products Webhook Handler
 * Handles real-time product updates from WHOP
 */

/**
 * POST /api/webhooks/whop-products - Handle WHOP product webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (in production, you'd want to verify the signature)
    const signature = request.headers.get('whop-signature');
    if (!signature) {
      console.warn('No webhook signature provided');
      // In production, you might want to reject unsigned webhooks
    }

    const { event, data, company_id } = body;

    if (!event || !data || !company_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle the webhook update
    await whopProductSync.handleWebhookUpdate(company_id, {
      event,
      data
    });

    console.log(`WHOP product webhook handled: ${event} for company ${company_id}`);

    return NextResponse.json(
      { success: true, message: 'Webhook processed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error handling WHOP product webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
