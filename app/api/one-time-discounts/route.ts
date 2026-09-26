import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withWhopAuth } from "@/lib/middleware/whop-auth";
import { db } from "@/lib/supabase/db-server";
import { experiences, oneTimeDiscounts } from "@/lib/supabase/schema";
import { authorizeExperience } from "@/lib/helpers/experience-access-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiscountMessage = {
	message: string;
	offsetHours: number;
	sendAsEmail?: boolean;
	emailSubject?: string;
	emailContent?: string;
	fromEmail?: string;
	isEmailHtml?: boolean;
};

type DiscountInput = {
	productId: string;
	promoCode: string;
	targetProductId: string;
	discountType: "percentage" | "fixed";
	discountAmount: number;
	messages: DiscountMessage[];
};

async function resolveExperience(experienceId: string) {
	if (experienceId.startsWith("exp_")) {
		return db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});
	}
	return db.query.experiences.findFirst({
		where: eq(experiences.id, experienceId),
	});
}

function toDiscount(row: typeof oneTimeDiscounts.$inferSelect): DiscountInput {
	const messages = Array.isArray(row.messages) ? (row.messages as DiscountMessage[]) : [];
	return {
		productId: row.productId,
		promoCode: row.promoCode,
		targetProductId: row.targetProductId,
		discountType: row.discountType === "fixed" ? "fixed" : "percentage",
		discountAmount: Number(row.discountAmount) || 0,
		messages,
	};
}

export const GET = withWhopAuth(async (request: NextRequest, context) => {
	const experienceId = request.nextUrl.searchParams.get("experienceId") || "";
	const access = await authorizeExperience({
		whopUserId: context.user.userId,
		headerExperienceId: context.user.experienceId,
		bodyExperienceId: experienceId || undefined,
		requireAdmin: true,
	});
	if (!access.ok) return access.response;
	const experience = access.experience;
	const rows = await db.query.oneTimeDiscounts.findMany({
		where: eq(oneTimeDiscounts.experienceId, experience.id),
	});

	return NextResponse.json({ discounts: rows.map(toDiscount) });
});

export const PUT = withWhopAuth(async (request: NextRequest, context) => {
	const body = await request.json();
	const experienceId = typeof body?.experienceId === "string" ? body.experienceId : "";
	const discounts = Array.isArray(body?.discounts) ? (body.discounts as DiscountInput[]) : null;

	if (!experienceId || !discounts) {
		return NextResponse.json({ error: "experienceId and discounts are required" }, { status: 400 });
	}

	const access = await authorizeExperience({
		whopUserId: context.user.userId,
		headerExperienceId: context.user.experienceId,
		bodyExperienceId: experienceId,
		requireAdmin: true,
	});
	if (!access.ok) return access.response;
	const experience = access.experience;

	const keptProductIds: string[] = [];
	for (const discount of discounts) {
		if (!discount?.productId || typeof discount.productId !== "string") continue;
		const discountType = discount.discountType === "fixed" ? "fixed" : "percentage";
		const messages = Array.isArray(discount.messages) ? discount.messages : [];
		keptProductIds.push(discount.productId);

		await db
			.insert(oneTimeDiscounts)
			.values({
				experienceId: experience.id,
				productId: discount.productId,
				promoCode: discount.promoCode || "",
				targetProductId: discount.targetProductId || "",
				discountType,
				discountAmount: String(Number(discount.discountAmount) || 0),
				messages,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [oneTimeDiscounts.experienceId, oneTimeDiscounts.productId],
				set: {
					promoCode: discount.promoCode || "",
					targetProductId: discount.targetProductId || "",
					discountType,
					discountAmount: String(Number(discount.discountAmount) || 0),
					messages,
					updatedAt: new Date(),
				},
			});
	}

	const existing = await db.query.oneTimeDiscounts.findMany({
		where: eq(oneTimeDiscounts.experienceId, experience.id),
		columns: { id: true, productId: true },
	});
	for (const row of existing) {
		if (!keptProductIds.includes(row.productId)) {
			await db.delete(oneTimeDiscounts).where(
				and(eq(oneTimeDiscounts.id, row.id), eq(oneTimeDiscounts.experienceId, experience.id)),
			);
		}
	}

	return NextResponse.json({ success: true });
});
