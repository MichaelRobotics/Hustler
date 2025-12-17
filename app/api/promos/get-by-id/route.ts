import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { promos } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { promoId } = body;

    if (!promoId) {
      return NextResponse.json(
        { error: 'Promo ID is required' },
        { status: 400 }
      );
    }

    // Query promo by database ID
    const promo = await db.query.promos.findFirst({
      where: eq(promos.id, promoId),
      columns: {
        id: true,
        whopPromoId: true,
        code: true,
        amountOff: true,
        baseCurrency: true,
        promoType: true,
        planIds: true,
        stock: true,
        unlimitedStock: true,
        promoDurationMonths: true,
        expiresAt: true,
        onePerCustomer: true,
        newUsersOnly: true,
        churnedUsersOnly: true,
        existingMembershipsOnly: true,
      },
    });

    if (!promo) {
      return NextResponse.json(
        { error: 'Promo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ promo });
  } catch (error) {
    console.error('Error fetching promo by ID:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to fetch promo' },
      { status: 500 }
    );
  }
});


