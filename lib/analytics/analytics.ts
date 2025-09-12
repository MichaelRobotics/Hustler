/**
 * Simplified Analytics System
 *
 * Basic analytics tracking for conversation completion and funnel interactions.
 * Simplified version focused on essential metrics only.
 */

import { and, count, eq, gte, lte } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import {
	conversations,
	funnelInteractions,
	funnels,
} from "../supabase/schema";

export interface BasicAnalytics {
	experienceId: string;
	totalConversations: number;
	completedConversations: number;
	activeConversations: number;
	completionRate: number;
	totalInteractions: number;
}

export interface FunnelBasicMetrics {
	funnelId: string;
	funnelName: string;
	totalConversations: number;
	completedConversations: number;
	completionRate: number;
	totalInteractions: number;
}

class SimplifiedAnalyticsSystem {
	/**
	 * Get basic analytics for an experience
	 */
	async getBasicAnalytics(
		user: AuthenticatedUser,
		startDate?: Date,
		endDate?: Date,
	): Promise<BasicAnalytics> {
		try {
			// Build date filter
			const dateFilter = [];
			if (startDate) {
				dateFilter.push(gte(conversations.createdAt, startDate));
			}
			if (endDate) {
				dateFilter.push(lte(conversations.createdAt, endDate));
			}

			// Get total conversations
			const totalConversations = await db
				.select({ count: count(conversations.id) })
				.from(conversations)
				.where(
					and(
						eq(conversations.experienceId, user.experienceId),
						...dateFilter,
					),
				);

			// Get completed conversations
			const completedConversations = await db
				.select({ count: count(conversations.id) })
				.from(conversations)
				.where(
					and(
						eq(conversations.experienceId, user.experienceId),
						eq(conversations.status, "completed"),
						...dateFilter,
					),
				);

			// Get active conversations
			const activeConversations = await db
				.select({ count: count(conversations.id) })
				.from(conversations)
				.where(
					and(
						eq(conversations.experienceId, user.experienceId),
						eq(conversations.status, "active"),
						...dateFilter,
					),
				);

			// Get total interactions
			const totalInteractions = await db
				.select({ count: count(funnelInteractions.id) })
				.from(funnelInteractions)
				.innerJoin(conversations, eq(funnelInteractions.conversationId, conversations.id))
				.where(
					and(
						eq(conversations.experienceId, user.experienceId),
						...dateFilter,
					),
				);

			const total = totalConversations[0]?.count || 0;
			const completed = completedConversations[0]?.count || 0;
			const active = activeConversations[0]?.count || 0;
			const interactions = totalInteractions[0]?.count || 0;

			return {
				experienceId: user.experienceId,
				totalConversations: total,
				completedConversations: completed,
				activeConversations: active,
				completionRate: total > 0 ? (completed / total) * 100 : 0,
				totalInteractions: interactions,
			};
		} catch (error) {
			console.error("Error getting basic analytics:", error);
			throw error;
		}
	}

	/**
	 * Get basic funnel metrics
	 */
	async getFunnelBasicMetrics(
		user: AuthenticatedUser,
		funnelId: string,
		startDate?: Date,
		endDate?: Date,
	): Promise<FunnelBasicMetrics> {
		try {
			// Build date filter
			const dateFilter = [];
			if (startDate) {
				dateFilter.push(gte(conversations.createdAt, startDate));
			}
			if (endDate) {
				dateFilter.push(lte(conversations.createdAt, endDate));
			}

			// Get funnel info
			const funnel = await db.query.funnels.findFirst({
				where: and(
					eq(funnels.id, funnelId),
					eq(funnels.experienceId, user.experienceId),
				),
			});

			if (!funnel) {
				throw new Error("Funnel not found");
			}

			// Get total conversations for this funnel
			const totalConversations = await db
				.select({ count: count(conversations.id) })
				.from(conversations)
				.where(
					and(
						eq(conversations.funnelId, funnelId),
						...dateFilter,
					),
				);

			// Get completed conversations for this funnel
			const completedConversations = await db
				.select({ count: count(conversations.id) })
				.from(conversations)
				.where(
					and(
						eq(conversations.funnelId, funnelId),
						eq(conversations.status, "completed"),
						...dateFilter,
					),
				);

			// Get total interactions for this funnel
			const totalInteractions = await db
				.select({ count: count(funnelInteractions.id) })
				.from(funnelInteractions)
				.innerJoin(conversations, eq(funnelInteractions.conversationId, conversations.id))
				.where(
					and(
						eq(conversations.funnelId, funnelId),
						...dateFilter,
					),
				);

			const total = totalConversations[0]?.count || 0;
			const completed = completedConversations[0]?.count || 0;
			const interactions = totalInteractions[0]?.count || 0;

			return {
				funnelId,
				funnelName: funnel.name,
				totalConversations: total,
				completedConversations: completed,
				completionRate: total > 0 ? (completed / total) * 100 : 0,
				totalInteractions: interactions,
			};
		} catch (error) {
			console.error("Error getting funnel basic metrics:", error);
			throw error;
		}
	}
}

export const simplifiedAnalyticsSystem = new SimplifiedAnalyticsSystem();