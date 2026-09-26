import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { authorizeExperience } from '@/lib/helpers/experience-access-gate';

// Force server-side only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic import to ensure server-only code stays server-only
export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId, seasonalDiscountId } = body;

    if (!seasonalDiscountId) {
      return NextResponse.json(
        { error: 'Seasonal discount ID is required' },
        { status: 400 }
      );
    }

    const access = await authorizeExperience({
      whopUserId: context.user.userId,
      headerExperienceId: context.user.experienceId,
      bodyExperienceId: experienceId,
    });
    if (!access.ok) return access.response;

    const { validateSeasonalDiscountInExperience } = await import('@/lib/actions/seasonal-discount-actions');
    const validation = await validateSeasonalDiscountInExperience(access.experience.whopExperienceId, seasonalDiscountId);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating seasonal discount:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to validate seasonal discount' },
      { status: 500 }
    );
  }
});





