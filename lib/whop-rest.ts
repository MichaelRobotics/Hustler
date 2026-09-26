/**
 * REST client for @whop/sdk@2.0.0.
 * The compiled client defaults Api-Version-Date to 2026-09-23 (BaseClient.js).
 * Pin it here so the key pin and the SDK cannot drift.
 * @whop/api stays for verifyUserToken; this package does not ship that helper.
 */

import { WhopClient } from "@whop/sdk";

export const WHOP_API_VERSION_DATE = "2026-09-23";

export function createWhopRestClient(token: string | undefined = process.env.WHOP_API_KEY): WhopClient {
	if (!token) {
		throw new Error("WHOP_API_KEY is not set");
	}
	return new WhopClient({
		token,
		apiVersionDate: WHOP_API_VERSION_DATE,
	});
}

export type ExperienceAccessLevel = "admin" | "customer" | "no_access";

/**
 * users.checkAccess. has_access false is no_access, matching the old accessLevel fallback.
 */
export async function checkExperienceAccess(
	userId: string,
	experienceId: string,
): Promise<{ has_access: boolean; access_level: ExperienceAccessLevel }> {
	const result = await createWhopRestClient().users.checkAccess({
		id: userId,
		resource_id: experienceId,
	});
	const access_level: ExperienceAccessLevel =
		result.has_access === false ? "no_access" : result.access_level;
	return {
		has_access: result.has_access === true && access_level !== "no_access",
		access_level,
	};
}

export async function retrieveWhopExperience(experienceId: string) {
	return createWhopRestClient().experiences.retrieve({ id: experienceId });
}

export async function retrieveWhopAccount(accountId: string) {
	return createWhopRestClient().accounts.retrieve({ id: accountId });
}

export async function retrieveWhopProduct(productId: string) {
	return createWhopRestClient().products.retrieve({ id: productId });
}

export function firstGalleryImageUrl(product: {
	gallery_images?: Array<{ url?: string | null }> | null;
}): string | null {
	const image = product.gallery_images?.find((item) => item.url);
	return image?.url ?? null;
}

export function accountBrandingFromProduct(product: {
	account?: Record<string, unknown> | null;
}): { title: string | null; bannerUrl: string | null; logoUrl: string | null } {
	const account = product.account ?? {};
	const text = (key: string) => (typeof account[key] === "string" && account[key] ? (account[key] as string) : null);
	return {
		title: text("title"),
		bannerUrl: text("banner_image_url"),
		logoUrl: text("logo_url"),
	};
}

/** Major-unit amount from a number or a Money object ({ amount, currency, decimals }). */
export function readMoneyAmount(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
	if (value && typeof value === "object" && "amount" in value) {
		const amount = Number((value as { amount: unknown }).amount);
		return Number.isFinite(amount) ? amount : 0;
	}
	return 0;
}
