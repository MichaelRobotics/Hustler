import { NextRequest, NextResponse } from "next/server";
import { requireRequestExperience } from "@/lib/helpers/experience-access-gate";

/**
 * GET /api/experience/link - Get experience link for iframe URL
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const experienceId = searchParams.get("experienceId");
		
		const access = await requireRequestExperience(request, { bodyExperienceId: experienceId });
		if (!access.ok) return access.response;

		const experience = access.experience;
		console.log(`[Experience Link] Getting link for experience: ${experience.whopExperienceId}`);

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
