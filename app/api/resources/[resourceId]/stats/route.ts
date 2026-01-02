import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { resources, experiences, promos } from '@/lib/supabase/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { calculateAverageRating } from '@/lib/services/reviews-sync-service';

export const dynamic = 'force-dynamic';

export const GET = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    const url = new URL(request.url);
    // Extract resourceId from path: /api/resources/[resourceId]/stats
    // Split by '/' and get the 3rd element (index 2) which is the resourceId
    const pathParts = url.pathname.split('/').filter(Boolean);
    const resourceIdIndex = pathParts.indexOf('resources');
    const resourceId = resourceIdIndex !== -1 && pathParts[resourceIdIndex + 1] ? pathParts[resourceIdIndex + 1] : null;
    
    // Get experienceId from query params or context
    const experienceId = url.searchParams.get('experienceId') || user.experienceId;
    
    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    if (!experienceId) {
      return NextResponse.json(
        { error: 'Experience ID is required' },
        { status: 400 }
      );
    }

    // Resolve experience ID if it's a Whop experience ID
    let resolvedExperienceId = experienceId;
    if (experienceId.startsWith('exp_')) {
      const experience = await db.query.experiences.findFirst({
        where: eq(experiences.whopExperienceId, experienceId),
        columns: { id: true },
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

    // Clean resourceId: remove "resource-" prefix if present
    let cleanedResourceId = resourceId;
    if (resourceId.startsWith('resource-')) {
      cleanedResourceId = resourceId.replace('resource-', '');
    }

    // Find resource by ID or by whopProductId (if resourceId is actually a whopProductId)
    let resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, cleanedResourceId),
        eq(resources.experienceId, resolvedExperienceId)
      ),
      columns: {
        id: true,
        whopProductId: true,
        sold: true,
        type: true,
        planId: true, // Added to retrieve plan_id
      },
    });

    // If not found by ID, try by whopProductId (in case resourceId is actually a whopProductId)
    if (!resource && resourceId.startsWith('prod_')) {
      resource = await db.query.resources.findFirst({
        where: and(
          eq(resources.whopProductId, resourceId),
          eq(resources.experienceId, resolvedExperienceId)
        ),
        columns: {
          id: true,
          whopProductId: true,
          sold: true,
          type: true,
        },
      });
    }

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Only fetch stats for WHOP and FILE types
    if (resource.type !== 'WHOP' && resource.type !== 'FILE') {
      return NextResponse.json(
        { error: 'Stats are only available for WHOP and FILE type products' },
        { status: 400 }
      );
    }

    // Get sold count from resource
    const sold = resource.sold;

    // Get review stats - handle both product and plan cases
    let starRating = 0;
    let reviewCount = 0;
    
    if (resource.whopProductId) {
      // Product-based reviews: use Whop API sync
      try {
        const reviewStats = await calculateAverageRating(
          resource.whopProductId,
          resolvedExperienceId,
          null // No planId for product reviews
        );
        starRating = reviewStats.averageStars;
        reviewCount = reviewStats.reviewCount;
      } catch (error) {
        console.error(`Error calculating review stats for product ${resource.whopProductId}:`, error);
        // Continue with default values (0, 0)
      }
    } else if (resource.planId) {
      // Plan-only reviews: query from DB only
      try {
        const reviewStats = await calculateAverageRating(
          null, // No whopProductId for plan reviews
          resolvedExperienceId,
          resource.planId
        );
        starRating = reviewStats.averageStars;
        reviewCount = reviewStats.reviewCount;
      } catch (error) {
        console.error(`Error calculating review stats for plan ${resource.planId}:`, error);
        // Continue with default values (0, 0)
      }
    }

    // Get promo stock (only if whopProductId exists)
    let promoStock: number | null = null;
    if (resource.whopProductId) {
      try {
        const productPromo = await db.query.promos.findFirst({
          where: and(
            eq(promos.productId, resource.whopProductId),
            sql`${promos.stock} IS NOT NULL`
          ),
          columns: {
            stock: true,
            unlimitedStock: true,
          },
          orderBy: [desc(promos.updatedAt)],
        });

        if (productPromo && !productPromo.unlimitedStock) {
          promoStock = productPromo.stock;
        }
      } catch (error) {
        console.error(`Error fetching promo stock for product ${resource.whopProductId}:`, error);
        // Continue with null value
      }
    }

    return NextResponse.json({
      sold: sold,
      starRating: starRating,
      reviewCount: reviewCount,
      promoStock: promoStock,
      productType: resource.type, // Return product type
      whopProductId: resource.whopProductId, // Return whopProductId
      planId: resource.planId, // Return planId
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch product stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

