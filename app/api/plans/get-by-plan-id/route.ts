import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { plans, promos } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // Find plan by planId
    const plan = await db.query.plans.findFirst({
      where: eq(plans.planId, planId),
      columns: {
        id: true,
        planId: true,
        promoIds: true,
        initialPrice: true,
        renewalPrice: true,
        planType: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // If plan has promoIds, fetch the first promo
    let promo = null;
    if (plan.promoIds && Array.isArray(plan.promoIds) && plan.promoIds.length > 0) {
      const promoIds = plan.promoIds as string[];
      // Fetch promo by whopPromoId (first one in array)
      promo = await db.query.promos.findFirst({
        where: eq(promos.whopPromoId, promoIds[0]),
        columns: {
          id: true,
          whopPromoId: true,
          code: true,
          amountOff: true,
          promoType: true,
          stock: true,
          unlimitedStock: true,
          promoDurationMonths: true,
          expiresAt: true,
        },
      });
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        planId: plan.planId,
        initialPrice: plan.initialPrice,
        renewalPrice: plan.renewalPrice,
        planType: plan.planType,
      },
      promo,
    });
  } catch (error) {
    console.error('Error getting plan with promo:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to get plan' },
      { status: 500 }
    );
  }
});



