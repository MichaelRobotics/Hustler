import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { reviews, resources, experiences, users, plans } from '@/lib/supabase/schema';
import { eq, and, or, isNotNull, isNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews - Fetch reviews for a resource or plan
 */
export const GET = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    const url = new URL(request.url);
    const resourceId = url.searchParams.get('resourceId');
    const planId = url.searchParams.get('planId');
    // Get experienceId from query params or context (same as stats endpoint)
    const experienceId = url.searchParams.get('experienceId') || user.experienceId;

    if (!experienceId) {
      return NextResponse.json(
        { error: 'Experience ID is required' },
        { status: 400 }
      );
    }

    if (!resourceId && !planId) {
      return NextResponse.json(
        { error: 'Either resourceId or planId is required' },
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

    // Build query conditions
    let whereConditions;
    if (resourceId) {
      whereConditions = and(
        eq(reviews.resourceId, resourceId),
        eq(reviews.experienceId, resolvedExperienceId),
        eq(reviews.status, 'published')
      );
    } else if (planId) {
      whereConditions = and(
        eq(reviews.planId, planId),
        eq(reviews.experienceId, resolvedExperienceId),
        eq(reviews.status, 'published'),
        sql`${reviews.whopProductId} IS NULL` // Only DB reviews for plans
      );
    } else {
      return NextResponse.json(
        { error: 'Either resourceId or planId is required' },
        { status: 400 }
      );
    }

    // Fetch reviews
    const reviewsList = await db.query.reviews.findMany({
      where: whereConditions,
      orderBy: (reviewsTable: typeof reviews.$inferSelect, { desc }: any) => [desc(reviewsTable.createdAt)],
    });

    return NextResponse.json({
      reviews: reviewsList.map((review: typeof reviews.$inferSelect) => ({
        id: review.id,
        title: review.title,
        description: review.description,
        stars: review.stars,
        userId: review.userId,
        userName: review.userName,
        userUsername: review.userUsername,
        createdAt: review.createdAt,
        publishedAt: review.publishedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch reviews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/reviews - Create a new review (for plan-only resources)
 */
export const POST = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    const url = new URL(request.url);
    console.log('[POST /api/reviews] Request URL:', request.url);
    console.log('[POST /api/reviews] Query params:', Object.fromEntries(url.searchParams));
    console.log('[POST /api/reviews] User context:', { userId: user.userId, experienceId: user.experienceId });
    
    const body = await request.json();
    const { resourceId, planId, stars, title, description } = body;
    // Get experienceId from query params or context (same as stats endpoint)
    const experienceId = url.searchParams.get('experienceId') || user.experienceId;
    console.log('[POST /api/reviews] Resolved experienceId:', experienceId);

    if (!experienceId) {
      return NextResponse.json(
        { error: 'Experience ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields - planId is required, resourceId is optional (will use plan's resourceId)
    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    // Validate resourceId format if provided (but we'll use plan's resourceId anyway)
    if (resourceId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(resourceId)) {
        console.log('[POST /api/reviews] ❌ Invalid resourceId format:', resourceId);
        return NextResponse.json(
          { error: 'Invalid resourceId format. Must be a valid UUID.' },
          { status: 400 }
        );
      }
    }

    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: 'stars must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Resolve experience ID if it's a Whop experience ID
    let resolvedExperienceId = experienceId;
    if (experienceId.startsWith('exp_')) {
      console.log('[POST /api/reviews] Looking up experience:', experienceId);
      const experience = await db.query.experiences.findFirst({
        where: eq(experiences.whopExperienceId, experienceId),
        columns: { id: true },
      });

      if (experience) {
        resolvedExperienceId = experience.id;
        console.log('[POST /api/reviews] ✅ Experience resolved:', { original: experienceId, resolved: resolvedExperienceId });
      } else {
        console.log('[POST /api/reviews] ❌ Experience not found in database:', experienceId);
        return NextResponse.json(
          { error: 'Experience not found' },
          { status: 404 }
        );
      }
    } else {
      console.log('[POST /api/reviews] Experience ID is not a Whop ID, using as-is:', experienceId);
    }

    // Verify plan exists (for plan-only resources, we verify the plan instead of the resource)
    console.log('[POST /api/reviews] Looking up plan:', { planId, resourceId, resolvedExperienceId });
    let plan;
    try {
      plan = await db.query.plans.findFirst({
        where: eq(plans.planId, planId),
        columns: { id: true, planId: true, resourceId: true },
      });
    } catch (dbError: any) {
      console.error('[POST /api/reviews] Database error looking up plan:', dbError);
      return NextResponse.json(
        { error: 'Failed to verify plan' },
        { status: 500 }
      );
    }

    if (!plan) {
      console.log('[POST /api/reviews] ❌ Plan not found:', planId);
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }
    console.log('[POST /api/reviews] ✅ Plan found:', { planId: plan.planId, planResourceId: plan.resourceId });

    // Always use the plan's resourceId as the source of truth
    // The frontend may pass a wrong resourceId, but we trust the plan's resourceId
    const finalResourceId = plan.resourceId;
    
    if (resourceId && resourceId !== finalResourceId) {
      console.log('[POST /api/reviews] ⚠️ Provided resourceId does not match plan\'s resourceId, using plan\'s resourceId:', { 
        provided: resourceId, 
        planResourceId: finalResourceId 
      });
    }
    if (!finalResourceId) {
      console.log('[POST /api/reviews] ❌ Plan has no resourceId');
      return NextResponse.json(
        { error: 'Plan is not associated with a resource' },
        { status: 400 }
      );
    }

    // Verify the resource exists and belongs to this experience (optional check)
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, finalResourceId),
        eq(resources.experienceId, resolvedExperienceId)
      ),
      columns: { id: true },
    });

    if (!resource) {
      console.log('[POST /api/reviews] ⚠️ Resource not found but plan exists, allowing review creation:', { resourceId: finalResourceId, resolvedExperienceId });
      // For plan-only resources, we allow creating reviews even if the resource doesn't exist yet
      // This can happen if the resource hasn't been synced yet
    } else {
      console.log('[POST /api/reviews] ✅ Resource found:', { resourceId: resource.id });
    }

    // Check if user already has a review for this resource/plan
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.resourceId, finalResourceId),
        eq(reviews.planId, planId),
        eq(reviews.userId, user.userId),
        eq(reviews.experienceId, resolvedExperienceId)
      ),
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already submitted a review for this resource' },
        { status: 400 }
      );
    }

    // Get user info (from auth context or fetch from users table)
    const dbUser = await db.query.users.findFirst({
      where: and(
        eq(users.whopUserId, user.userId),
        eq(users.experienceId, resolvedExperienceId)
      ),
      columns: { name: true },
    });

    // Generate unique review ID for DB reviews (format: db-{timestamp}-{random})
    const uniqueReviewId = `db-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Create review (UUID, createdAt, updatedAt will be generated by database defaults)
    const reviewData = {
      experienceId: resolvedExperienceId,
      resourceId: finalResourceId,
      whopProductId: null, // Plan-only resources don't have whopProductId
      planId: planId,
      whopReviewId: uniqueReviewId, // Generate unique ID for DB reviews
      title: title || null,
      description: description || null,
      stars: stars,
      status: 'published' as const, // Auto-publish DB reviews
      paidForProduct: null,
      userId: user.userId,
      userName: dbUser?.name || null,
      userUsername: null,
      publishedAt: new Date(),
      joinedAt: null,
    };

    const [newReview] = await db.insert(reviews).values(reviewData).returning();

    return NextResponse.json({
      success: true,
      review: {
        id: newReview.id,
        title: newReview.title,
        description: newReview.description,
        stars: newReview.stars,
        createdAt: newReview.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

