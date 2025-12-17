import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { experiences } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { promoId, experienceId } = body;

    if (!promoId || !experienceId) {
      return NextResponse.json(
        { error: 'Promo ID and experience ID are required' },
        { status: 400 }
      );
    }

    // Resolve experienceId to companyId
    let whopCompanyId: string | undefined;
    
    if (experienceId.startsWith('exp_')) {
      const experience = await db.query.experiences.findFirst({
        where: eq(experiences.whopExperienceId, experienceId),
        columns: {
          whopCompanyId: true,
        },
      });
      if (experience) {
        whopCompanyId = experience.whopCompanyId;
      }
    } else {
      const experience = await db.query.experiences.findFirst({
        where: eq(experiences.id, experienceId),
        columns: {
          whopCompanyId: true,
        },
      });
      if (experience) {
        whopCompanyId = experience.whopCompanyId;
      }
    }

    if (!whopCompanyId) {
      return NextResponse.json(
        { error: 'Company ID not found for experience' },
        { status: 404 }
      );
    }

    const { deletePromoById } = await import('@/lib/actions/seasonal-discount-actions');
    const result = await deletePromoById(promoId, whopCompanyId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete promo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      plansUpdated: result.plansUpdated 
    });
  } catch (error) {
    console.error('Error deleting promo:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to delete promo' },
      { status: 500 }
    );
  }
});

