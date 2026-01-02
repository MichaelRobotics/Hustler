import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { experiences } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';
import { whopSdk } from '@/lib/whop-sdk';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/route - Get company route/slug for current experience
 */
export const GET = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

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
        columns: { id: true, whopCompanyId: true },
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

    // Get company ID from experience
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.id, resolvedExperienceId),
      columns: { whopCompanyId: true },
    });

    if (!experience?.whopCompanyId) {
      return NextResponse.json(
        { error: 'Company ID not found' },
        { status: 404 }
      );
    }

    // Get company route from Whop SDK
    try {
      const companyResult = await whopSdk.companies.getCompany({
        companyId: experience.whopCompanyId,
      });

      const company = companyResult as any;
      const route = company?.route || null;
      const logo = company?.logo?.sourceUrl || company?.logo || null;

      if (!route) {
        return NextResponse.json(
          { error: 'Company route not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        route: route,
        companyId: experience.whopCompanyId,
        logo: logo,
      });
    } catch (error) {
      console.error('Error fetching company route:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch company route',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error getting company route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get company route',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

