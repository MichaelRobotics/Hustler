import { relations } from "drizzle-orm/relations";
import { funnels, funnelResources, resources, conversations, funnelInteractions, experiences, users, funnelAnalytics, originTemplates, messages, funnelResourceAnalytics, templates, themes } from "./schema";

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
	originTemplates: many(originTemplates),
	conversations: many(conversations),
	funnelResourceAnalytics: many(funnelResourceAnalytics),
	templates: many(templates),
	themes: many(themes),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	funnels: many(funnels),
	resources: many(resources),
	experience: one(experiences, {
		fields: [users.experienceId],
		references: [experiences.id]
	}),
	templates: many(templates),
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

export const originTemplatesRelations = relations(originTemplates, ({one}) => ({
	experience: one(experiences, {
		fields: [originTemplates.experienceId],
		references: [experiences.id]
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

export const templatesRelations = relations(templates, ({one}) => ({
	experience: one(experiences, {
		fields: [templates.experienceId],
		references: [experiences.id]
	}),
	theme: one(themes, {
		fields: [templates.themeId],
		references: [themes.id]
	}),
	user: one(users, {
		fields: [templates.userId],
		references: [users.id]
	}),
}));

export const themesRelations = relations(themes, ({one, many}) => ({
	templates: many(templates),
	experience: one(experiences, {
		fields: [themes.experienceId],
		references: [experiences.id]
	}),
}));