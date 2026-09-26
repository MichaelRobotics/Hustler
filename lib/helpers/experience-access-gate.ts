import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/supabase/db-server";
import { experiences } from "@/lib/supabase/schema";
import { whopSdk } from "@/lib/whop-sdk";
import { checkExperienceAccess } from "@/lib/whop-rest";
import { sameExperienceId } from "@/lib/helpers/experience-id";

type ExperienceRow = typeof experiences.$inferSelect;

export { sameExperienceId };

export async function authorizeExperience(input: {
	whopUserId: string;
	headerExperienceId?: string | null;
	bodyExperienceId?: string | null;
	requireAdmin?: boolean;
}): Promise<
	| { ok: true; experience: ExperienceRow; companyId: string }
	| { ok: false; response: NextResponse }
> {
	const headerId = input.headerExperienceId || undefined;
	const bodyId = input.bodyExperienceId || undefined;
	const lookupId = headerId || bodyId;
	if (!lookupId) {
		return {
			ok: false,
			response: NextResponse.json({ error: "Experience ID is required" }, { status: 400 }),
		};
	}

	const experience = await db.query.experiences.findFirst({
		where: lookupId.startsWith("exp_")
			? eq(experiences.whopExperienceId, lookupId)
			: or(eq(experiences.id, lookupId), eq(experiences.whopExperienceId, lookupId)),
	});
	if (!experience) {
		return {
			ok: false,
			response: NextResponse.json({ error: "Experience not found" }, { status: 404 }),
		};
	}

	if (headerId && !sameExperienceId(headerId, experience)) {
		return {
			ok: false,
			response: NextResponse.json({ error: "Experience ID does not match this session" }, { status: 403 }),
		};
	}
	if (bodyId && !sameExperienceId(bodyId, experience)) {
		return {
			ok: false,
			response: NextResponse.json({ error: "Experience ID does not match this session" }, { status: 403 }),
		};
	}

	let access: { has_access: boolean; access_level: string };
	try {
		access = await checkExperienceAccess(input.whopUserId, experience.whopExperienceId);
	} catch (error) {
		console.error("Experience access check failed:", error);
		return {
			ok: false,
			response: NextResponse.json({ error: "Failed to verify experience access" }, { status: 403 }),
		};
	}

	if (!access.has_access) {
		return {
			ok: false,
			response: NextResponse.json({ error: "Access denied" }, { status: 403 }),
		};
	}
	if (input.requireAdmin && access.access_level !== "admin") {
		return {
			ok: false,
			response: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
		};
	}

	return { ok: true, experience, companyId: experience.whopCompanyId };
}

export async function requireRequestExperience(
	request: NextRequest,
	options?: { requireAdmin?: boolean; bodyExperienceId?: string | null },
): Promise<
	| { ok: true; whopUserId: string; experience: ExperienceRow; companyId: string }
	| { ok: false; response: NextResponse }
> {
	let whopUserId: string | undefined;
	try {
		const headersList = await headers();
		const verified = await whopSdk.verifyUserToken(headersList);
		whopUserId = verified.userId;
	} catch (error) {
		console.error("Request experience auth failed:", error);
	}
	if (!whopUserId) {
		return {
			ok: false,
			response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
		};
	}

	const headerExperienceId = request.headers.get("X-Experience-ID")
		|| request.nextUrl.searchParams.get("experienceId");
	const authorized = await authorizeExperience({
		whopUserId,
		headerExperienceId,
		bodyExperienceId: options?.bodyExperienceId,
		requireAdmin: options?.requireAdmin,
	});
	if (!authorized.ok) return authorized;
	return { ok: true, whopUserId, experience: authorized.experience, companyId: authorized.companyId };
}
