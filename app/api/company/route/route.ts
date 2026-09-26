import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { retrieveWhopAccount } from '@/lib/whop-rest';
import { authorizeExperience } from '@/lib/helpers/experience-access-gate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company/route - Get company route/slug for current experience
 */
export const GET = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    const access = await authorizeExperience({
      whopUserId: user.userId,
      headerExperienceId: experienceId,
    });
    if (!access.ok) return access.response;

    const experience = access.experience;

    if (!experience.whopCompanyId) {
      return NextResponse.json(
        { error: 'Company ID not found' },
        { status: 404 }
      );
    }

    // Get company route from Whop SDK
    try {
      const companyResult = await retrieveWhopAccount(experience.whopCompanyId);

      const route = companyResult.route || null;
      const logo = companyResult.logo_url || null;

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

