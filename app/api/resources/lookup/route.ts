import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { resources, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/resources/lookup - Lookup resource by experience UUID and plan_id
 * 
 * Query params:
 * - experienceId: string (Whop experience ID)
 * - planId: string (Whop plan ID)
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const experienceId = searchParams.get("experienceId");
		const planId = searchParams.get("planId");

		if (!experienceId) {
			return NextResponse.json(
				{ error: "experienceId parameter is required" },
				{ status: 400 }
			);
		}

		if (!planId) {
			return NextResponse.json(
				{ error: "planId parameter is required" },
				{ status: 400 }
			);
		}

		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				return NextResponse.json(
					{ error: "Experience not found" },
					{ status: 404 }
				);
			}
		}

		// Query resource by experience_id and plan_id
		const resource = await db.query.resources.findFirst({
			where: and(
				eq(resources.experienceId, resolvedExperienceId),
				eq(resources.planId, planId)
			),
			columns: {
				id: true,
				planId: true,
				checkoutConfigurationId: true,
				name: true,
				type: true,
				price: true,
			},
		});

		if (!resource) {
			return NextResponse.json(
				{ error: "Resource not found for the specified experience and plan" },
				{ status: 404 }
			);
		}

		// Return resource data
		return NextResponse.json({
			resource: {
				id: resource.id,
				planId: resource.planId,
				checkoutConfigurationId: resource.checkoutConfigurationId,
				name: resource.name,
				type: resource.type,
				price: resource.price,
			},
		});
	} catch (error) {
		console.error("Error looking up resource:", error);
		return NextResponse.json(
			{ error: "Failed to lookup resource" },
			{ status: 500 }
		);
	}
}


