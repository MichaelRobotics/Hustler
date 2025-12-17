import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import type { DiscountSettings } from '@/lib/components/store/SeasonalStore/types';

// Force server-side only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic import to ensure server-only code stays server-only
export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId, companyId, discountData, promoCode } = body;

    if (!experienceId || !companyId || !discountData || !promoCode) {
      return NextResponse.json(
        { error: 'Experience ID, company ID, discount data, and promo code are required' },
        { status: 400 }
      );
    }

    // Dynamic import to prevent bundling issues
    const { createPromoCodeForSeasonalDiscount } = await import('@/lib/actions/seasonal-discount-actions');
    const promoId = await createPromoCodeForSeasonalDiscount(
      experienceId,
      companyId,
      discountData as DiscountSettings,
      promoCode
    );

    return NextResponse.json({ success: true, promoId });
  } catch (error: any) {
    // If promo code already exists in Whop API (even with different product_id), return success
    // Whop API doesn't allow duplicate codes globally, but we want to allow them across products
    const errorMessage = error?.message || error?.error?.message || '';
    const errorString = typeof error === 'string' ? error : JSON.stringify(error);
    const statusCode = error?.status || error?.statusCode || error?.response?.status;
    
    if (
      statusCode === 400 ||
      errorMessage.includes('already exists') || 
      errorMessage.includes('duplicate') ||
      errorMessage.includes('already been taken') ||
      errorString.includes('already exists') ||
      errorString.includes('already been taken') ||
      errorString.includes('already been taken by another promo code')
    ) {
      // Some promos may have been created successfully, return success
      return NextResponse.json({ success: true, promoId: null });
    }
    console.error('Error creating promo code:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to create promo code' },
      { status: 500 }
    );
  }
});



