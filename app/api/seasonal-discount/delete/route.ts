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
    const { experienceId } = body;

    const access = await authorizeExperience({
      whopUserId: context.user.userId,
      headerExperienceId: context.user.experienceId,
      bodyExperienceId: experienceId,
      requireAdmin: true,
    });
    if (!access.ok) return access.response;

    const { deleteSeasonalDiscountPromos } = await import('@/lib/actions/seasonal-discount-actions');
    await deleteSeasonalDiscountPromos(access.experience.whopExperienceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting seasonal discount promos:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to delete seasonal discount promos' },
      { status: 500 }
    );
  }
});





