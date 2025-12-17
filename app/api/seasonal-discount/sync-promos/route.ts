import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';

// Force server-side only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic import to ensure server-only code stays server-only
export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId, companyId } = body;

    if (!experienceId || !companyId) {
      return NextResponse.json(
        { error: 'Experience ID and company ID are required' },
        { status: 400 }
      );
    }

    // Dynamic import to prevent bundling issues
    const { syncPromosFromWhopAPI } = await import('@/lib/actions/seasonal-discount-actions');
    const count = await syncPromosFromWhopAPI(experienceId, companyId);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error syncing promos:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to sync promos' },
      { status: 500 }
    );
  }
});





