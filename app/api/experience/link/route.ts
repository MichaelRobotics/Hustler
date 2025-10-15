import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/experience/link - Get experience link for iframe URL
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

		console.log(`[Experience Link] Getting link for experience: ${experienceId}`);

		// Query experience from database
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
			columns: {
				id: true,
				whopExperienceId: true,
				whopCompanyId: true,
				name: true,
				link: true
			}
		});

		if (!experience) {
			console.log(`[Experience Link] No experience found for: ${experienceId}`);
			return NextResponse.json(
				{ error: "Experience not found" },
				{ status: 404 }
			);
		}

		console.log(`[Experience Link] Found experience:`, {
			id: experience.id,
			whopExperienceId: experience.whopExperienceId,
			name: experience.name,
			link: experience.link,
			hasLink: !!experience.link
		});

		return NextResponse.json({
			success: true,
			experience: {
				id: experience.id,
				whopExperienceId: experience.whopExperienceId,
				whopCompanyId: experience.whopCompanyId,
				name: experience.name,
				link: experience.link
			}
		});

	} catch (error) {
		console.error("[Experience Link] Error getting experience link:", error);
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json(
			{ 
				error: "Internal server error",
				details: errorMessage
			},
			{ status: 500 }
		);
	}
}
