import { pgTable, index, foreignKey, unique, uuid, timestamp, text, jsonb, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const conversationStatus = pgEnum("conversation_status", ['active', 'completed', 'closed', 'abandoned'])
export const generationStatus = pgEnum("generation_status", ['idle', 'generating', 'completed', 'failed'])
export const messageType = pgEnum("message_type", ['user', 'bot'])
export const resourceCategory = pgEnum("resource_category", ['PAID', 'FREE_VALUE'])
export const resourceType = pgEnum("resource_type", ['AFFILIATE', 'MY_PRODUCTS'])


export const funnelResources = pgTable("funnel_resources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	funnelId: uuid("funnel_id").notNull(),
	resourceId: uuid("resource_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("funnel_resources_funnel_id_idx").using("btree", table.funnelId.asc().nullsLast().op("uuid_ops")),
	index("funnel_resources_resource_id_idx").using("btree", table.resourceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnels.id],
			name: "funnel_resources_funnel_id_funnels_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.resourceId],
			foreignColumns: [resources.id],
			name: "funnel_resources_resource_id_resources_id_fk"
		}).onDelete("cascade"),
	unique("unique_funnel_resource").on(table.funnelId, table.resourceId),
]);

export const funnelInteractions = pgTable("funnel_interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	blockId: text("block_id").notNull(),
	optionText: text("option_text").notNull(),
	nextBlockId: text("next_block_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("funnel_interactions_block_id_idx").using("btree", table.blockId.asc().nullsLast().op("text_ops")),
	index("funnel_interactions_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "funnel_interactions_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
]);

export const funnels = pgTable("funnels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	flow: jsonb(),
	isDeployed: boolean("is_deployed").default(false).notNull(),
	wasEverDeployed: boolean("was_ever_deployed").default(false).notNull(),
	generationStatus: generationStatus("generation_status").default('idle').notNull(),
	sends: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	experienceId: uuid("experience_id").notNull(),
	visualizationState: jsonb("visualization_state").default({}),
	whopProductId: text("whop_product_id"),
}, (table) => [
	index("funnels_experience_deployed_idx").using("btree", table.experienceId.asc().nullsLast().op("bool_ops"), table.isDeployed.asc().nullsLast().op("uuid_ops")),
	index("funnels_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("funnels_experience_product_deployed_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops"), table.whopProductId.asc().nullsLast().op("uuid_ops"), table.isDeployed.asc().nullsLast().op("uuid_ops")),
	index("funnels_experience_user_updated_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	index("funnels_generation_status_idx").using("btree", table.generationStatus.asc().nullsLast().op("enum_ops")),
	index("funnels_is_deployed_idx").using("btree", table.isDeployed.asc().nullsLast().op("bool_ops")),
	index("funnels_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("funnels_visualization_state_idx").using("gin", table.visualizationState.asc().nullsLast().op("jsonb_ops")),
	index("funnels_whop_product_id_idx").using("btree", table.whopProductId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "funnels_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "funnels_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const funnelAnalytics = pgTable("funnel_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	funnelId: uuid("funnel_id").notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	starts: integer().default(0).notNull(),
	completions: integer().default(0).notNull(),
	conversions: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	experienceId: uuid("experience_id").notNull(),
	affiliateRevenue: numeric("affiliate_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	productRevenue: numeric("product_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	freeClicks: integer("free_clicks").default(0).notNull(),
	resourceId: uuid("resource_id"),
	resourceClicks: integer("resource_clicks").default(0).notNull(),
	resourceConversions: integer("resource_conversions").default(0).notNull(),
	resourceRevenue: numeric("resource_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
}, (table) => [
	index("funnel_analytics_affiliate_revenue_idx").using("btree", table.affiliateRevenue.asc().nullsLast().op("numeric_ops")),
	index("funnel_analytics_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("funnel_analytics_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("funnel_analytics_funnel_id_idx").using("btree", table.funnelId.asc().nullsLast().op("uuid_ops")),
	index("funnel_analytics_product_revenue_idx").using("btree", table.productRevenue.asc().nullsLast().op("numeric_ops")),
	index("funnel_analytics_resource_id_idx").using("btree", table.resourceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "funnel_analytics_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnels.id],
			name: "funnel_analytics_funnel_id_funnels_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.resourceId],
			foreignColumns: [resources.id],
			name: "funnel_analytics_resource_id_resources_id_fk"
		}).onDelete("cascade"),
	unique("unique_funnel_date").on(table.funnelId, table.date),
]);

export const resources = pgTable("resources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	type: resourceType().notNull(),
	category: resourceCategory().notNull(),
	link: text().notNull(),
	code: text(),
	description: text(),
	whopProductId: text("whop_product_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	experienceId: uuid("experience_id").notNull(),
	whopAppId: text("whop_app_id"),
	whopMembershipId: text("whop_membership_id"),
}, (table) => [
	index("resources_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("resources_experience_user_updated_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	index("resources_type_category_idx").using("btree", table.type.asc().nullsLast().op("enum_ops"), table.category.asc().nullsLast().op("enum_ops")),
	index("resources_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("resources_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("resources_whop_app_id_idx").using("btree", table.whopAppId.asc().nullsLast().op("text_ops")),
	index("resources_whop_membership_id_idx").using("btree", table.whopMembershipId.asc().nullsLast().op("text_ops")),
	index("resources_whop_product_id_idx").using("btree", table.whopProductId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "resources_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "resources_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	whopUserId: text("whop_user_id").notNull(),
	email: text().notNull(),
	name: text().notNull(),
	avatar: text(),
	credits: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	experienceId: uuid("experience_id").notNull(),
	accessLevel: text("access_level").default('customer').notNull(),
	productsSynced: boolean("products_synced").default(false).notNull(),
}, (table) => [
	index("users_access_level_idx").using("btree", table.accessLevel.asc().nullsLast().op("text_ops")),
	index("users_experience_access_level_idx").using("btree", table.experienceId.asc().nullsLast().op("text_ops"), table.accessLevel.asc().nullsLast().op("uuid_ops")),
	index("users_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("users_experience_updated_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops"), table.updatedAt.asc().nullsLast().op("uuid_ops")),
	index("users_whop_user_id_idx").using("btree", table.whopUserId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "users_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	unique("users_whop_user_experience_unique").on(table.whopUserId, table.experienceId),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	funnelId: uuid("funnel_id").notNull(),
	status: conversationStatus().default('active').notNull(),
	currentBlockId: text("current_block_id"),
	userPath: jsonb("user_path"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	experienceId: uuid("experience_id").notNull(),
	whopUserId: text("whop_user_id").notNull(),
	phase2StartTime: timestamp("phase2_start_time", { mode: 'string' }),
}, (table) => [
	index("conversations_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("conversations_funnel_id_idx").using("btree", table.funnelId.asc().nullsLast().op("uuid_ops")),
	index("conversations_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("conversations_whop_user_id_idx").using("btree", table.whopUserId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "conversations_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnels.id],
			name: "conversations_funnel_id_funnels_id_fk"
		}).onDelete("cascade"),
	unique("unique_active_user_conversation").on(table.experienceId, table.whopUserId),
]);

export const experiences = pgTable("experiences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	whopExperienceId: text("whop_experience_id").notNull(),
	whopCompanyId: text("whop_company_id").notNull(),
	name: text().notNull(),
	description: text(),
	logo: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("experiences_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	index("experiences_whop_company_id_idx").using("btree", table.whopCompanyId.asc().nullsLast().op("text_ops")),
	index("experiences_whop_experience_id_idx").using("btree", table.whopExperienceId.asc().nullsLast().op("text_ops")),
	unique("experiences_whop_experience_id_unique").on(table.whopExperienceId),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	type: messageType().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("messages_conversation_id_idx").using("btree", table.conversationId.asc().nullsLast().op("uuid_ops")),
	index("messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("messages_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
]);
