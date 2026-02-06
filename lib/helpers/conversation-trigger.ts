/**
 * Inter-Merchant Trigger-Based Conversations
 *
 * Shared helpers for event-triggered conversation creation:
 * - hasActiveConversation: guard so we never create a second conversation per user per experience
 * - findFunnelForTrigger: pick the right deployed funnel for an event (trigger hierarchy + filters)
 *
 * Membership webhooks (membership.went_valid, membership.deactivated) are events; they do NOT start
 * conversations by themselves. Funnel TRIGGERS use these webhooks: any_membership_buy, membership_buy
 * respond to membership.went_valid; cancel_membership, any_cancel_membership respond to membership.deactivated.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, funnels, resources } from "../supabase/schema";
import { getMemberResourceIds, memberPassesTriggerFilter } from "./trigger-filter";

/** Trigger type values used in hierarchy; must match funnel_trigger_type enum */
type TriggerTypeValue =
	| "on_app_entry"
	| "no_active_conversation"
	| "qualification_merchant_complete"
	| "upsell_merchant_complete"
	| "delete_merchant_conversation"
	| "any_membership_buy"
	| "membership_buy"
	| "any_cancel_membership"
	| "cancel_membership";

/** Event context: app_entry, funnel_completed, merchant_conversation_deleted use app triggers; membership_activated/deactivated use membership triggers */
export type TriggerContext = "app_entry" | "membership_activated" | "membership_deactivated" | "funnel_completed" | "merchant_conversation_deleted";

export interface FindFunnelForTriggerOptions {
	/** For funnel_completed: only consider triggers that reference this funnel (e.g. "after this qualification, go to this upsell") */
	completedFunnelId?: string;
	/** Whop user ID for membership filter (resource-based); use internal user UUID for getMemberResourceIds */
	whopUserId?: string;
	/** Internal user UUID for getMemberResourceIds when checking membership filters */
	userId?: string;
	/** Whop product ID from membership webhook; used to match membership_buy / cancel_membership to funnel's resource */
	productId?: string;
}

/** Funnel row as returned from DB (minimal for conversation creation) */
export interface FunnelForTrigger {
	id: string;
	experienceId: string;
	name?: string;
	flow: unknown;
	appTriggerType: string | null;
	membershipTriggerType: string | null;
	appTriggerConfig: unknown;
	membershipTriggerConfig: unknown;
	merchantType: string | null;
}

/**
 * Returns true if the user already has an active conversation in this experience.
 * Used as guard before creating any new conversation (app entry, membership valid, user join, funnel completed, no active on app load).
 */
export async function hasActiveConversation(
	experienceId: string,
	whopUserId: string
): Promise<boolean> {
	const row = await db.query.conversations.findFirst({
		where: and(
			eq(conversations.experienceId, experienceId),
			eq(conversations.whopUserId, whopUserId),
			eq(conversations.status, "active")
		),
		columns: { id: true },
	});
	return !!row;
}

/** Trigger-type hierarchy per context: try these trigger types in order until we find a matching deployed funnel */
const TRIGGER_HIERARCHY: Record<TriggerContext, TriggerTypeValue[]> = {
	app_entry: ["on_app_entry", "no_active_conversation"],
	membership_activated: ["any_membership_buy", "membership_buy"],
	membership_deactivated: ["any_cancel_membership", "cancel_membership"],
	funnel_completed: ["qualification_merchant_complete", "upsell_merchant_complete"],
	merchant_conversation_deleted: ["delete_merchant_conversation"],
};

/**
 * Find the funnel to use for a new conversation given the event context.
 * - For app_entry: prefer on_app_entry, then no_active_conversation; apply app trigger filters.
 * - For membership_activated (webhook membership.went_valid): any_membership_buy, then membership_buy; apply membership filters; for membership_buy filter by productId.
 * - For membership_deactivated (webhook membership.deactivated): any_cancel_membership, then cancel_membership; for cancel_membership filter by productId.
 * - For funnel_completed: only consider funnels whose trigger config references completedFunnelId; apply filters.
 * If multiple funnels match, picks one randomly (tie-break).
 */
export async function findFunnelForTrigger(
	experienceId: string,
	triggerContext: TriggerContext,
	options?: FindFunnelForTriggerOptions
): Promise<FunnelForTrigger | null> {
	const hierarchy = TRIGGER_HIERARCHY[triggerContext];
	const completedFunnelId = options?.completedFunnelId;
	const whopUserId = options?.whopUserId;
	const userId = options?.userId;
	const productId = options?.productId;

	for (const triggerType of hierarchy) {
		// Build base query: deployed funnels for this experience with this trigger type
		const isAppContext = triggerContext === "app_entry";
		const isMerchantConversationDeletedContext = triggerContext === "merchant_conversation_deleted";
		const isMembershipActivated = triggerContext === "membership_activated";
		const isMembershipDeactivated = triggerContext === "membership_deactivated";
		const isFunnelCompletedContext = triggerContext === "funnel_completed";
		const isMembershipContext = isMembershipActivated || isMembershipDeactivated;

		let candidates: FunnelForTrigger[] = [];

		if (isAppContext || isMerchantConversationDeletedContext) {
			const rows = await db
				.select({
					id: funnels.id,
					experienceId: funnels.experienceId,
					flow: funnels.flow,
					appTriggerType: funnels.appTriggerType,
					membershipTriggerType: funnels.membershipTriggerType,
					appTriggerConfig: funnels.appTriggerConfig,
					membershipTriggerConfig: funnels.membershipTriggerConfig,
					merchantType: funnels.merchantType,
				})
				.from(funnels)
				.where(
					and(
						eq(funnels.experienceId, experienceId),
						eq(funnels.isDeployed, true),
						eq(funnels.isDraft, false),
						eq(funnels.appTriggerType, triggerType)
					)
				);
			candidates = rows as FunnelForTrigger[];
		} else if (isMembershipContext) {
			const rows = await db
				.select({
					id: funnels.id,
					experienceId: funnels.experienceId,
					flow: funnels.flow,
					appTriggerType: funnels.appTriggerType,
					membershipTriggerType: funnels.membershipTriggerType,
					appTriggerConfig: funnels.appTriggerConfig,
					membershipTriggerConfig: funnels.membershipTriggerConfig,
					merchantType: funnels.merchantType,
				})
				.from(funnels)
				.where(
					and(
						eq(funnels.experienceId, experienceId),
						eq(funnels.isDeployed, true),
						eq(funnels.isDraft, false),
						eq(funnels.membershipTriggerType, triggerType)
					)
				);
			candidates = rows as FunnelForTrigger[];

			// For membership_buy / cancel_membership: only include funnel if its config.resourceId's resource matches webhook productId
			if ((triggerType === "membership_buy" || triggerType === "cancel_membership") && productId) {
				const filtered: FunnelForTrigger[] = [];
				for (const f of candidates) {
					const config = f.membershipTriggerConfig as { resourceId?: string } | null | undefined;
					const resourceId = config?.resourceId;
					if (!resourceId) {
						// No specific resource configured: don't match (specific trigger should have resource)
						continue;
					}
					const resource = await db.query.resources.findFirst({
						where: and(
							eq(resources.id, resourceId),
							eq(resources.experienceId, experienceId)
						),
						columns: { whopProductId: true, planId: true },
					});
					if (resource && (resource.whopProductId === productId || resource.planId === productId)) {
						filtered.push(f);
					}
				}
				candidates = filtered;
			}
		} else if (isFunnelCompletedContext && completedFunnelId) {
			// Funnel-completed: only funnels whose trigger config references completedFunnelId
			const rows = await db
				.select({
					id: funnels.id,
					experienceId: funnels.experienceId,
					flow: funnels.flow,
					appTriggerType: funnels.appTriggerType,
					membershipTriggerType: funnels.membershipTriggerType,
					appTriggerConfig: funnels.appTriggerConfig,
					membershipTriggerConfig: funnels.membershipTriggerConfig,
					merchantType: funnels.merchantType,
				})
				.from(funnels)
				.where(
					and(
						eq(funnels.experienceId, experienceId),
						eq(funnels.isDeployed, true),
						eq(funnels.isDraft, false),
						eq(funnels.appTriggerType, triggerType)
					)
				);
			// Filter by trigger config funnelId (app or membership config may reference completed funnel)
			const withMatchingFunnelId = (rows as FunnelForTrigger[]).filter((f) => {
				const appConfig = f.appTriggerConfig as { funnelId?: string } | null | undefined;
				const memConfig = f.membershipTriggerConfig as { funnelId?: string } | null | undefined;
				return (
					appConfig?.funnelId === completedFunnelId || memConfig?.funnelId === completedFunnelId
				);
			});
			candidates = withMatchingFunnelId;
		} else if (isFunnelCompletedContext && !completedFunnelId) {
			continue;
		}

		if (candidates.length === 0) continue;

		// For app_entry / merchant_conversation_deleted in preview (no userId), include all candidates so Store Preview can start chat with any live App entry / No active conversation funnel
		const isPreviewAppEntry = (isAppContext || isMerchantConversationDeletedContext) && userId === undefined;
		let filtered: FunnelForTrigger[];
		if (isPreviewAppEntry) {
			filtered = candidates;
		} else {
			// Apply membership filter when we have user context
			const memberResourceIds =
				userId !== undefined
					? await getMemberResourceIds(experienceId, userId)
					: [];

			filtered = [];
			for (const funnel of candidates) {
				const config = (isAppContext || isMerchantConversationDeletedContext)
					? (funnel.appTriggerConfig as { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] } | null)
					: (funnel.membershipTriggerConfig as { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] } | null);
				const required = config?.filterResourceIdsRequired;
				const exclude = config?.filterResourceIdsExclude;
				if (
					(required?.length ?? 0) === 0 &&
					(exclude?.length ?? 0) === 0
				) {
					filtered.push(funnel);
				} else if (
					memberPassesTriggerFilter(required, exclude, memberResourceIds)
				) {
					filtered.push(funnel);
				}
			}
		}

		if (filtered.length === 0) continue;

		// Tie-break: pick one randomly
		const chosen = filtered[Math.floor(Math.random() * filtered.length)] as FunnelForTrigger;
		if (!chosen.flow || typeof (chosen.flow as { startBlockId?: string }).startBlockId !== "string") {
			continue;
		}
		return chosen;
	}

	return null;
}

/**
 * Find all funnels that would be triggered for the given context (e.g. funnel_completed, membership_activated, membership_deactivated).
 * Same logic as findFunnelForTrigger but returns the full list instead of one random match.
 * Used in preview to list "next merchants" that would start after current conversation completes or on membership buy/cancel.
 * When no userId/productId is provided (preview), membership and product filters are skipped so all matching funnels are returned.
 */
export async function findFunnelsForTrigger(
	experienceId: string,
	triggerContext: TriggerContext,
	options?: FindFunnelForTriggerOptions
): Promise<FunnelForTrigger[]> {
	const completedFunnelId = options?.completedFunnelId;
	const userId = options?.userId;
	const productId = options?.productId;
	const hierarchy = TRIGGER_HIERARCHY[triggerContext];
	let allCandidates: FunnelForTrigger[] = [];

	if (triggerContext === "funnel_completed") {
		if (!completedFunnelId) return [];
		for (const triggerType of hierarchy) {
			const rows = await db
				.select({
					id: funnels.id,
					experienceId: funnels.experienceId,
					name: funnels.name,
					flow: funnels.flow,
					appTriggerType: funnels.appTriggerType,
					membershipTriggerType: funnels.membershipTriggerType,
					appTriggerConfig: funnels.appTriggerConfig,
					membershipTriggerConfig: funnels.membershipTriggerConfig,
					merchantType: funnels.merchantType,
				})
				.from(funnels)
				.where(
					and(
						eq(funnels.experienceId, experienceId),
						eq(funnels.isDeployed, true),
						eq(funnels.isDraft, false),
						eq(funnels.appTriggerType, triggerType)
					)
				);
			const withMatchingFunnelId = (rows as FunnelForTrigger[]).filter((f) => {
				const appConfig = f.appTriggerConfig as { funnelId?: string } | null | undefined;
				const memConfig = f.membershipTriggerConfig as { funnelId?: string } | null | undefined;
				return (
					appConfig?.funnelId === completedFunnelId || memConfig?.funnelId === completedFunnelId
				);
			});
			allCandidates = allCandidates.concat(withMatchingFunnelId);
		}
	} else if (triggerContext === "membership_activated" || triggerContext === "membership_deactivated") {
		for (const triggerType of hierarchy) {
			const rows = await db
				.select({
					id: funnels.id,
					experienceId: funnels.experienceId,
					name: funnels.name,
					flow: funnels.flow,
					appTriggerType: funnels.appTriggerType,
					membershipTriggerType: funnels.membershipTriggerType,
					appTriggerConfig: funnels.appTriggerConfig,
					membershipTriggerConfig: funnels.membershipTriggerConfig,
					merchantType: funnels.merchantType,
				})
				.from(funnels)
				.where(
					and(
						eq(funnels.experienceId, experienceId),
						eq(funnels.isDeployed, true),
						eq(funnels.isDraft, false),
						eq(funnels.membershipTriggerType, triggerType)
					)
				);
			let candidates = rows as FunnelForTrigger[];
			// In preview (no productId) skip product filter; otherwise filter membership_buy/cancel_membership by productId
			if ((triggerType === "membership_buy" || triggerType === "cancel_membership") && productId) {
				const filtered: FunnelForTrigger[] = [];
				for (const f of candidates) {
					const config = f.membershipTriggerConfig as { resourceId?: string } | null | undefined;
					const resourceId = config?.resourceId;
					if (!resourceId) continue;
					const resource = await db.query.resources.findFirst({
						where: and(
							eq(resources.id, resourceId),
							eq(resources.experienceId, experienceId)
						),
						columns: { whopProductId: true, planId: true },
					});
					if (resource && (resource.whopProductId === productId || resource.planId === productId)) {
						filtered.push(f);
					}
				}
				candidates = filtered;
			}
			allCandidates = allCandidates.concat(candidates);
		}
		// Dedupe by funnel id (same funnel can match multiple trigger types in hierarchy)
		const seen = new Set<string>();
		allCandidates = allCandidates.filter((f) => {
			if (seen.has(f.id)) return false;
			seen.add(f.id);
			return true;
		});
	} else {
		return [];
	}

	if (allCandidates.length === 0) return [];

	const hasValidFlow = (f: FunnelForTrigger) =>
		f.flow && typeof (f.flow as { startBlockId?: string }).startBlockId === "string";

	// When no user context (preview), skip membership filter and return all
	if (userId === undefined) {
		return allCandidates.filter(hasValidFlow);
	}

	// Apply membership filter when we have user context (funnel_completed only; membership contexts already filtered by type)
	const memberResourceIds = await getMemberResourceIds(experienceId, userId);
	const filtered: FunnelForTrigger[] = [];
	for (const funnel of allCandidates) {
		const config = funnel.appTriggerConfig as {
			filterResourceIdsRequired?: string[];
			filterResourceIdsExclude?: string[];
		} | null;
		const required = config?.filterResourceIdsRequired;
		const exclude = config?.filterResourceIdsExclude;
		if (
			(required?.length ?? 0) === 0 &&
			(exclude?.length ?? 0) === 0
		) {
			filtered.push(funnel);
		} else if (memberPassesTriggerFilter(required, exclude, memberResourceIds)) {
			filtered.push(funnel);
		}
	}

	return filtered.filter(hasValidFlow);
}
