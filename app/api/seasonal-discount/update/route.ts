import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { authorizeExperience } from '@/lib/helpers/experience-access-gate';
import type { SeasonalDiscountData } from '@/lib/actions/seasonal-discount-actions';

// Force server-side only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic import to ensure server-only code stays server-only
export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId: requestedExperienceId, discountData } = body;

    if (!discountData) {
      return NextResponse.json(
        { error: 'Discount data is required' },
        { status: 400 }
      );
    }

    const access = await authorizeExperience({
      whopUserId: context.user.userId,
      headerExperienceId: context.user.experienceId,
      bodyExperienceId: requestedExperienceId,
      requireAdmin: true,
    });
    if (!access.ok) return access.response;
    const experienceId = access.experience.whopExperienceId;

    // Dynamic import to prevent bundling issues
    const { updateExperienceSeasonalDiscount } = await import('@/lib/actions/seasonal-discount-actions');
    await updateExperienceSeasonalDiscount(experienceId, discountData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating seasonal discount:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to update seasonal discount' },
      { status: 500 }
    );
  }
});





