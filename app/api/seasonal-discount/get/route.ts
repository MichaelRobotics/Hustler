import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';

// Force server-side only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic import to ensure server-only code stays server-only
export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId } = body;

    if (!experienceId) {
      return NextResponse.json(
        { error: 'Experience ID is required' },
        { status: 400 }
      );
    }

    // Dynamic import to prevent bundling issues
    const { getExperienceSeasonalDiscount } = await import('@/lib/actions/seasonal-discount-actions');
    const discountData = await getExperienceSeasonalDiscount(experienceId);

    return NextResponse.json({ discountData });
  } catch (error) {
    console.error('Error getting seasonal discount:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to get seasonal discount' },
      { status: 500 }
    );
  }
});





