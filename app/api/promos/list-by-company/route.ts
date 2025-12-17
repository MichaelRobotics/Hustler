import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth } from '@/lib/middleware/whop-auth';
import { db } from '@/lib/supabase/db-server';
import { experiences } from '@/lib/supabase/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withWhopAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const { experienceId, companyId } = body;

    // Resolve companyId from experienceId if not provided
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && experienceId) {
      let resolvedExperienceId = experienceId;
      if (experienceId.startsWith('exp_')) {
        const experience = await db.query.experiences.findFirst({
          where: eq(experiences.whopExperienceId, experienceId),
          columns: {
            id: true,
            whopCompanyId: true,
          },
        });
        if (experience) {
          resolvedExperienceId = experience.id;
          resolvedCompanyId = experience.whopCompanyId;
        }
      } else {
        const experience = await db.query.experiences.findFirst({
          where: eq(experiences.id, experienceId),
          columns: {
            whopCompanyId: true,
          },
        });
        if (experience) {
          resolvedCompanyId = experience.whopCompanyId;
        }
      }
    }

    if (!resolvedCompanyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Import Whop SDK client
    const Whop = (await import('@whop/sdk')).default;
    const client = new Whop({
      apiKey: process.env.WHOP_API_KEY!,
    });

    // Access promoCodes from client
    const promoCodesClient = (client as any).promoCodes;
    if (!promoCodesClient) {
      throw new Error('promoCodes is not available on Whop SDK client');
    }

    // List all promos from Whop API for this company
    const allPromoCodes: string[] = [];
    try {
      for await (const promoListResponse of promoCodesClient.list({
        company_id: resolvedCompanyId,
        // No filters - get all promos for the company
      })) {
        if (promoListResponse.data && Array.isArray(promoListResponse.data)) {
          for (const promo of promoListResponse.data) {
            if (promo.code) {
              allPromoCodes.push(promo.code);
            }
          }
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

