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
    const { experienceId, companyId } = body;

    const access = await authorizeExperience({
      whopUserId: context.user.userId,
      headerExperienceId: context.user.experienceId,
      bodyExperienceId: experienceId,
      requireAdmin: true,
    });
    if (!access.ok) return access.response;

    const { deleteOrphanedPromos } = await import('@/lib/actions/seasonal-discount-actions');
    const result = await deleteOrphanedPromos(access.companyId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting orphaned promos:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to delete orphaned promos' },
      { status: 500 }
    );
  }
});



