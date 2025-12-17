import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    // Product-scoped promos are no longer created - all promos are plan-based
    // Return empty array since we only create plan-based promos now
    return NextResponse.json({ promos: [] });
  } catch (error) {
    console.error('Error listing promos by product:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to list promos' },
      { status: 500 }
    );
  }
});


