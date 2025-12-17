import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';

// Force server-side only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic import to ensure server-only code stays server-only
export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId, seasonalDiscountId } = body;

    if (!experienceId || !seasonalDiscountId) {
      return NextResponse.json(
        { error: 'Experience ID and seasonal discount ID are required' },
        { status: 400 }
      );
    }

    // Dynamic import to prevent bundling issues
    const { validateSeasonalDiscountInExperience } = await import('@/lib/actions/seasonal-discount-actions');
    const validation = await validateSeasonalDiscountInExperience(experienceId, seasonalDiscountId);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating seasonal discount:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to validate seasonal discount' },
      { status: 500 }
    );
  }
});



