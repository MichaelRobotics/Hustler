import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { reviews, experiences } from '@/lib/supabase/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/reviews/[reviewId] - Update a review (if user owns it)
 */
export const PUT = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    const url = new URL(request.url);
    const reviewId = url.pathname.split('/').pop();
    const body = await request.json();
    const { stars, title, description } = body;
    const experienceId = user.experienceId;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
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

    // Validate stars if provided
    if (stars !== undefined && (stars < 1 || stars > 5)) {
      return NextResponse.json(
        { error: 'stars must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Find review and verify ownership
    const review = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.id, reviewId),
        eq(reviews.experienceId, resolvedExperienceId)
      ),
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Verify user owns this review
    if (review.userId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only update your own reviews' },
        { status: 403 }
      );
    }

    // Update review
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (stars !== undefined) updateData.stars = stars;
    if (title !== undefined) updateData.title = title || null;
    if (description !== undefined) updateData.description = description || null;

    await db
      .update(reviews)
      .set(updateData)
      .where(eq(reviews.id, reviewId));

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/reviews/[reviewId] - Delete a review (if user owns it)
 */
export const DELETE = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    const url = new URL(request.url);
    const reviewId = url.pathname.split('/').pop();
    const experienceId = user.experienceId;

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
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

    // Find review and verify ownership
    const review = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.id, reviewId),
        eq(reviews.experienceId, resolvedExperienceId)
      ),
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Verify user owns this review
    if (review.userId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    // Delete review
    await db.delete(reviews).where(eq(reviews.id, reviewId));

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});


