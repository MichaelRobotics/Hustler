import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { experiences } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';
import { createWhopRestClient } from '@/lib/whop-rest';
import { authorizeExperience } from '@/lib/helpers/experience-access-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId, companyId } = body;

    const access = await authorizeExperience({
      whopUserId: context.user.userId,
      headerExperienceId: context.user.experienceId,
      bodyExperienceId: experienceId,
      requireAdmin: true,
    });
    if (!access.ok) return access.response;
    const resolvedCompanyId = access.companyId;

    const client = createWhopRestClient();

    const allPromoCodes: string[] = [];
    try {
      for await (const promo of await client.promoCodes.list({
        account_id: resolvedCompanyId,
      })) {
        if (promo.code) {
          allPromoCodes.push(promo.code);
        }
      }
    } catch (error) {
      console.error('Error listing promos from Whop API:', error);
      // Return empty array on error - frontend will proceed with original code
      return NextResponse.json({ promos: [] });
    }

    return NextResponse.json({ promos: allPromoCodes });
  } catch (error) {
    console.error('Error listing promos by company:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to list promos' },
      { status: 500 }
    );
  }
});

