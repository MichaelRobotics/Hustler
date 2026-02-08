import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * GET /api/experience/[experienceId]/app-link
 * Returns the experience app URL (for Send DM block and similar).
 * experienceId is the Whop experience ID (e.g. "exp_AziQBERoXrnrEH"), not the internal UUID.
 *
 * URL format: https://whop.com/joined/{company-route}/{whopExperienceId}/app/
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ experienceId: string }> }
) {
	try {
		const { experienceId } = await params;
		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
			columns: { link: true, whopCompanyId: true, whopExperienceId: true },
		});

		// If a custom link is stored, use it directly
		if (experience?.link) {
			return NextResponse.json({ link: experience.link });
		}

		// No link stored yet — fetch company route from Whop API, build the URL, and save it
		if (experience?.whopCompanyId) {
			try {
				const companyResult = await whopSdk.companies.getCompany({
					companyId: experience.whopCompanyId,
				});
				const company = companyResult as any;
				const companyRoute = company?.route;

				if (companyRoute) {
					const link = `https://whop.com/joined/${companyRoute}/${experienceId}/app/`;

					// Save to DB so we don't call the API again
					await db
						.update(experiences)
						.set({ link })
						.where(eq(experiences.whopExperienceId, experienceId));

					return NextResponse.json({ link });
				}
			} catch (err) {
				console.error("[app-link] Failed to fetch company route:", err);
			}
		}

		return NextResponse.json({ link: "https://whop.com/apps/" });
	} catch (e) {
		console.error("[app-link] Error:", e);
		return NextResponse.json(
			{ error: "Failed to get app link" },
			{ status: 500 }
		);
	}
}
