import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { resources, plans } from '@/lib/supabase/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { productId, experienceId } = body;

    if (!productId || !experienceId) {
      return NextResponse.json(
        { error: 'Product ID and Experience ID are required' },
        { status: 400 }
      );
    }

    // Resolve Whop experience ID to database UUID if needed
    let resolvedExperienceId = experienceId;
    if (experienceId.startsWith('exp_')) {
      const { experiences } = await import('@/lib/supabase/schema');
      const experience = await db.query.experiences.findFirst({
        where: eq(experiences.whopExperienceId, experienceId),
        columns: {
          id: true,
        },
      });

      if (experience) {
        resolvedExperienceId = experience.id;
      } else {
        return NextResponse.json(
          { error: 'Experience not found' },
          { status: 404 }
        );
      }
    }

    // Clean productId: remove "resource-" prefix if present, or extract UUID from various formats
    let cleanedProductId = productId;
    if (productId.startsWith('resource-')) {
      cleanedProductId = productId.replace('resource-', '');
    } else if (productId.startsWith('prod_')) {
      // It's a Whop product ID, use as-is
      cleanedProductId = productId;
    }

    // Try to find resource by whopProductId first
    let resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.whopProductId, cleanedProductId),
        eq(resources.experienceId, resolvedExperienceId)
      ),
      columns: {
        id: true,
        planId: true,
        whopProductId: true,
        checkoutConfigurationId: true,
      },
    });

    // If not found by whopProductId, try by resource id (if productId is actually a resource id/UUID)
    if (!resource) {
      // Only try UUID lookup if cleanedProductId looks like a UUID (not a Whop ID)
      if (!cleanedProductId.startsWith('prod_') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanedProductId)) {
        resource = await db.query.resources.findFirst({
          where: and(
            eq(resources.id, cleanedProductId),
            eq(resources.experienceId, resolvedExperienceId)
          ),
          columns: {
            id: true,
            planId: true,
            whopProductId: true,
            checkoutConfigurationId: true,
          },
        });
      }
    }

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // If resource has planId, get the plan to check for checkoutConfigurationId
    let planId = resource.planId;
    let checkoutConfigurationId = resource.checkoutConfigurationId;

    if (resource.planId) {
      const plan = await db.query.plans.findFirst({
        where: eq(plans.planId, resource.planId),
        columns: {
          checkoutConfigurationId: true,
        },
      });

      if (plan?.checkoutConfigurationId) {
        checkoutConfigurationId = plan.checkoutConfigurationId;
      }
    }

    return NextResponse.json({
      resource: {
        planId,
        whopProductId: resource.whopProductId,
        checkoutConfigurationId,
      },
    });
  } catch (error) {
    console.error('Error getting resource by product:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to get resource' },
      { status: 500 }
    );
  }
});





