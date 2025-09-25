import { relations } from "drizzle-orm/relations";
import { funnels, funnelResources, resources, conversations, funnelInteractions, experiences, users, funnelAnalytics, messages, funnelResourceAnalytics } from "./schema";

export const funnelResourcesRelations = relations(funnelResources, ({one}) => ({
	funnel: one(funnels, {
		fields: [funnelResources.funnelId],
		references: [funnels.id]
	}),
	resource: one(resources, {
		fields: [funnelResources.resourceId],
		references: [resources.id]
	}),
}));

export const funnelsRelations = relations(funnels, ({one, many}) => ({
	funnelResources: many(funnelResources),
	experience: one(experiences, {
		fields: [funnels.experienceId],
		references: [experiences.id]
	}),
	user: one(users, {
		fields: [funnels.userId],
		references: [users.id]
	}),
	funnelAnalytics: many(funnelAnalytics),
	conversations: many(conversations),
	funnelResourceAnalytics: many(funnelResourceAnalytics),
}));

export const resourcesRelations = relations(resources, ({one, many}) => ({
	funnelResources: many(funnelResources),
	experience: one(experiences, {
		fields: [resources.experienceId],
		references: [experiences.id]
	}),
	user: one(users, {
		fields: [resources.userId],
		references: [users.id]
	}),
	funnelResourceAnalytics: many(funnelResourceAnalytics),
}));

export const funnelInteractionsRelations = relations(funnelInteractions, ({one}) => ({
	conversation: one(conversations, {
		fields: [funnelInteractions.conversationId],
		references: [conversations.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	funnelInteractions: many(funnelInteractions),
	experience: one(experiences, {
		fields: [conversations.experienceId],
		references: [experiences.id]
	}),
	funnel: one(funnels, {
		fields: [conversations.funnelId],
		references: [funnels.id]
	}),
	messages: many(messages),
}));

export const experiencesRelations = relations(experiences, ({many}) => ({
	funnels: many(funnels),
	resources: many(resources),
	users: many(users),
	funnelAnalytics: many(funnelAnalytics),
	conversations: many(conversations),
	funnelResourceAnalytics: many(funnelResourceAnalytics),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	funnels: many(funnels),
	resources: many(resources),
	experience: one(experiences, {
		fields: [users.experienceId],
		references: [experiences.id]
	}),
}));

export const funnelAnalyticsRelations = relations(funnelAnalytics, ({one}) => ({
	experience: one(experiences, {
		fields: [funnelAnalytics.experienceId],
		references: [experiences.id]
	}),
	funnel: one(funnels, {
		fields: [funnelAnalytics.funnelId],
		references: [funnels.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
}));

export const funnelResourceAnalyticsRelations = relations(funnelResourceAnalytics, ({one}) => ({
	experience: one(experiences, {
		fields: [funnelResourceAnalytics.experienceId],
		references: [experiences.id]
	}),
	funnel: one(funnels, {
		fields: [funnelResourceAnalytics.funnelId],
		references: [funnels.id]
	}),
	resource: one(resources, {
		fields: [funnelResourceAnalytics.resourceId],
		references: [resources.id]
	}),
}));