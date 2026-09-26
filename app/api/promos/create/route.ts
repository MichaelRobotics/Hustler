import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { promos, plans, experiences } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';
import { createWhopRestClient } from '@/lib/whop-rest';
import { authorizeExperience } from '@/lib/helpers/experience-access-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { 
      experienceId,
      companyId, 
      promoCode, 
      amountOff, 
      promoType, 
      planIds, 
      stock, 
      unlimitedStock, 
      promoDurationMonths 
    } = body;

    if (!promoCode || amountOff === undefined || !promoType || !planIds || !Array.isArray(planIds) || planIds.length === 0) {
      return NextResponse.json(
        { error: 'Promo code, amount off, promo type, and plan IDs are required' },
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
    const resolvedCompanyId = access.companyId;

    const client = createWhopRestClient();

    const promo = await client.promoCodes.create({
      account_id: resolvedCompanyId,
      code: promoCode,
      amount_off: amountOff,
      base_currency: 'usd',
      promo_type: promoType === 'percentage' ? 'percentage' : 'flat_amount',
      new_users_only: false,
      promo_duration_months: promoDurationMonths || 0,
      plan_ids: planIds,
      // Don't set product_id (applies to plans)
      stock: unlimitedStock ? undefined : (stock || undefined),
      unlimited_stock: unlimitedStock ? true : undefined,
    });

    // Save to promos table
    await db.insert(promos).values({
      whopCompanyId: resolvedCompanyId,
      whopPromoId: promo.id,
      code: promoCode,
      amountOff: amountOff.toString(),
      baseCurrency: 'usd',
      companyId: resolvedCompanyId,
      newUsersOnly: false,
      promoDurationMonths: promoDurationMonths || 0,
      promoType: promoType === 'percentage' ? 'percentage' : 'flat_amount',
      planIds: JSON.stringify(planIds),
      productId: null, // No product_id - applies to plans
      stock: unlimitedStock ? null : (stock || null),
      unlimitedStock: unlimitedStock || false,
    });

    // Update all plans with promo ID
    let updatedCount = 0;
    let notFoundCount = 0;
    for (const planId of planIds) {
      try {
        // Find plan by planId (Whop plan ID)
        const plan = await db.query.plans.findFirst({
          where: eq(plans.planId, planId),
          columns: {
            id: true,
            promoIds: true,
          },
        });

        if (!plan) {
          console.warn(`⚠️ Plan not found for planId: ${planId}`);
          notFoundCount++;
          continue;
        }

        const currentPromoIds = (plan.promoIds as string[] | null) || [];
        if (!currentPromoIds.includes(promo.id)) {
          const updatedPromoIds = [...currentPromoIds, promo.id];
          await db
            .update(plans)
            .set({
              promoIds: updatedPromoIds,
              updatedAt: new Date(),
            })
            .where(eq(plans.id, plan.id));
          updatedCount++;
          console.log(`✅ Updated plan ${plan.id} with promo ${promo.id}`);
        } else {
          console.log(`ℹ️ Plan ${plan.id} already has promo ${promo.id}`);
        }
      } catch (error) {
        console.error(`❌ Error updating plan ${planId} with promo ${promo.id}:`, error);
      }
    }

    console.log(`📊 Promo update summary: ${updatedCount} updated, ${notFoundCount} not found, ${planIds.length - updatedCount - notFoundCount} already had promo`);

    // Get the database promo ID
    const savedPromo = await db.query.promos.findFirst({
      where: eq(promos.whopPromoId, promo.id),
      columns: {
        id: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      promoId: savedPromo?.id || null,
      whopPromoId: promo.id 
    });
  } catch (error: any) {
    console.error('Error creating promo:', error instanceof Error ? error.message : String(error));
    console.error('Error details:', error);
    
    // Extract more detailed error message
    let errorMessage = 'Failed to create promo';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
});




