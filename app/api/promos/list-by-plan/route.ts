import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { plans, promos } from '@/lib/supabase/schema';
import { eq, inArray, sql } from 'drizzle-orm';

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

    console.log(`🔍 Looking up plan with planId: ${planId}`);
    
    // Find plan by planId (Whop plan ID)
    const plan = await db.query.plans.findFirst({
      where: eq(plans.planId, planId),
      columns: {
        promoIds: true,
      },
    });

    if (!plan) {
      console.warn(`⚠️ Plan not found for planId: ${planId}`);
      return NextResponse.json({ promos: [] });
    }

    if (!plan.promoIds) {
      console.log(`ℹ️ Plan ${planId} has no promoIds`);
      return NextResponse.json({ promos: [] });
    }

    const promoIds = plan.promoIds as string[];
    if (promoIds.length === 0) {
      console.log(`ℹ️ Plan ${planId} has empty promoIds array`);
      return NextResponse.json({ promos: [] });
    }

    console.log(`📋 Found plan with ${promoIds.length} promo IDs:`, promoIds);

    // Query promos where whopPromoId is in the promoIds array
    // Use inArray for proper array handling
    const promosList = await db
      .select({
        id: promos.id,
        code: promos.code,
      })
      .from(promos)
      .where(inArray(promos.whopPromoId, promoIds));

    console.log(`🎫 Found ${promosList.length} promos for plan ${planId}`);
    return NextResponse.json({ promos: promosList });
  } catch (error) {
    console.error('Error listing promos by plan:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to list promos' },
      { status: 500 }
    );
  }
});



