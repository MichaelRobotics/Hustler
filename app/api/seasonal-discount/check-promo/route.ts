import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { authorizeExperience } from '@/lib/helpers/experience-access-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId, promoCode, planIds } = body;

    if (!promoCode) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    const access = await authorizeExperience({
      whopUserId: context.user.userId,
      headerExperienceId: context.user.experienceId,
      bodyExperienceId: experienceId,
      requireAdmin: true,
    });
    if (!access.ok) return access.response;

    const { checkPromoConflict } = await import('@/lib/actions/seasonal-discount-actions');
    const hasConflict = await checkPromoConflict(
      access.companyId,
      planIds || []
    );

    return NextResponse.json({ hasConflict });
  } catch (error) {
    console.error('Error checking promo code conflict:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to check promo code conflict' },
      { status: 500 }
    );
  }
});





