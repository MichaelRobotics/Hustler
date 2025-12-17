import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { companyId, promoCode, productId, planIds } = body;

    if (!companyId || !promoCode) {
      return NextResponse.json(
        { error: 'Company ID and promo code are required' },
        { status: 400 }
      );
    }

    const { checkPromoConflict } = await import('@/lib/actions/seasonal-discount-actions');
    // Only check planIds conflicts (product-scoped promos are no longer used)
    const hasConflict = await checkPromoConflict(
      companyId,
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





