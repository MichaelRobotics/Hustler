import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/debug/experience-link - Debug experience link field
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const experienceId = searchParams.get("experienceId");
		
		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		console.log(`[Debug] Checking experience link for: ${experienceId}`);

		// Query experience from database
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			return NextResponse.json(
				{ error: "Experience not found" },
				{ status: 404 }
			);
		}

		console.log(`[Debug] Experience found:`, {
			id: experience.id,
			whopExperienceId: experience.whopExperienceId,
			whopCompanyId: experience.whopCompanyId,
			name: experience.name,
			link: experience.link,
			linkType: typeof experience.link,
			linkLength: experience.link?.length || 0
		});

		return NextResponse.json({
			experience: {
				id: experience.id,
				whopExperienceId: experience.whopExperienceId,
				whopCompanyId: experience.whopCompanyId,
				name: experience.name,
				link: experience.link,
				linkType: typeof experience.link,
				linkLength: experience.link?.length || 0
			}
		});

	} catch (error) {
		console.error("Error checking experience link:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
