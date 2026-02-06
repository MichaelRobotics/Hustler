import { pgTable, index, foreignKey, unique, uuid, timestamp, text, jsonb, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const conversationStatus = pgEnum("conversation_status", ['active', 'completed', 'closed', 'abandoned', 'archived'])
export const generationStatus = pgEnum("generation_status", ['idle', 'generating', 'completed', 'failed'])
export const messageType = pgEnum("message_type", ['user', 'bot'])
export const resourceCategory = pgEnum("resource_category", ['PAID', 'FREE_VALUE'])
export const resourceType = pgEnum("resource_type", ['AFFILIATE', 'MY_PRODUCTS'])
export const subscriptionType = pgEnum("subscription_type", ['Basic', 'Pro', 'Vip'])


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
	whopMembershipId: text("whop_membership_id"),
	price: numeric({ precision: 10, scale:  2 }),
	image: text(),
	storageUrl: text("storage_url"),
}, (table) => [
	index("resources_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("resources_experience_user_updated_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops"), table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	index("resources_type_category_idx").using("btree", table.type.asc().nullsLast().op("enum_ops"), table.category.asc().nullsLast().op("enum_ops")),
	index("resources_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("resources_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
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

export const funnelAnalytics = pgTable("funnel_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	experienceId: uuid("experience_id").notNull(),
	funnelId: uuid("funnel_id").notNull(),
	totalStarts: integer("total_starts").default(0).notNull(),
	totalIntent: integer("total_intent").default(0).notNull(),
	totalConversions: integer("total_conversions").default(0).notNull(),
	totalAffiliateRevenue: numeric("total_affiliate_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	totalProductRevenue: numeric("total_product_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	totalInterest: integer("total_interest").default(0).notNull(),
	todayStarts: integer("today_starts").default(0).notNull(),
	todayIntent: integer("today_intent").default(0).notNull(),
	todayConversions: integer("today_conversions").default(0).notNull(),
	todayAffiliateRevenue: numeric("today_affiliate_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	todayProductRevenue: numeric("today_product_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	todayInterest: integer("today_interest").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	startsGrowthPercent: numeric("starts_growth_percent", { precision: 5, scale:  2 }).default('0').notNull(),
	intentGrowthPercent: numeric("intent_growth_percent", { precision: 5, scale:  2 }).default('0').notNull(),
	conversionsGrowthPercent: numeric("conversions_growth_percent", { precision: 5, scale:  2 }).default('0').notNull(),
	interestGrowthPercent: numeric("interest_growth_percent", { precision: 5, scale:  2 }).default('0').notNull(),
	yesterdayStarts: integer("yesterday_starts").default(0).notNull(),
	yesterdayIntent: integer("yesterday_intent").default(0).notNull(),
	yesterdayConversions: integer("yesterday_conversions").default(0).notNull(),
	yesterdayInterest: integer("yesterday_interest").default(0).notNull(),
}, (table) => [
	index("funnel_analytics_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("funnel_analytics_funnel_id_idx").using("btree", table.funnelId.asc().nullsLast().op("uuid_ops")),
	index("funnel_analytics_last_updated_idx").using("btree", table.lastUpdated.asc().nullsLast().op("timestamp_ops")),
	index("funnel_analytics_total_revenue_idx").using("btree", table.totalAffiliateRevenue.asc().nullsLast().op("numeric_ops"), table.totalProductRevenue.asc().nullsLast().op("numeric_ops")),
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
	unique("unique_funnel").on(table.funnelId),
]);

export const originTemplates = pgTable("origin_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	experienceId: uuid("experience_id").notNull(),
	companyLogoUrl: text("company_logo_url"),
	companyBannerImageUrl: text("company_banner_image_url"),
	themePrompt: text("theme_prompt"),
	defaultThemeData: jsonb("default_theme_data").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("origin_templates_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "origin_templates_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	unique("origin_templates_experience_unique").on(table.experienceId),
]);

export const experiences = pgTable("experiences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	whopExperienceId: text("whop_experience_id").notNull(),
	whopCompanyId: text("whop_company_id").notNull(),
	name: text().notNull(),
	description: text(),
	subscription: subscriptionType("subscription"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	link: text(),
}, (table) => [
	index("experiences_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamp_ops")),
	index("experiences_whop_company_id_idx").using("btree", table.whopCompanyId.asc().nullsLast().op("text_ops")),
	index("experiences_whop_experience_id_idx").using("btree", table.whopExperienceId.asc().nullsLast().op("text_ops")),
	unique("experiences_whop_experience_id_unique").on(table.whopExperienceId),
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
	membershipId: text("membership_id"),
	myAffiliateLink: text("my_affiliate_link"),
	affiliateSend: boolean("affiliate_send").default(false).notNull(),
	whopProductId: text("whop_product_id"),
	userLastReadAt: timestamp("user_last_read_at", { mode: 'string' }),
	adminLastReadAt: timestamp("admin_last_read_at", { mode: 'string' }),
	unreadCountAdmin: integer("unread_count_admin").default(0).notNull(),
	unreadCountUser: integer("unread_count_user").default(0).notNull(),
	controlledBy: text("controlled_by").default("bot").notNull(),
	userTyping: boolean("user_typing").default(false).notNull(),
	adminTyping: boolean("admin_typing").default(false).notNull(),
	userTypingAt: timestamp("user_typing_at", { mode: 'string' }),
	adminTypingAt: timestamp("admin_typing_at", { mode: 'string' }),
	flow: jsonb(),
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
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	type: messageType().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb("metadata"), // e.g. { senderType: "admin", senderId, timestamp } for LiveChat
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

export const funnelResourceAnalytics = pgTable("funnel_resource_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	experienceId: uuid("experience_id").notNull(),
	funnelId: uuid("funnel_id").notNull(),
	resourceId: uuid("resource_id").notNull(),
	totalResourceClicks: integer("total_resource_clicks").default(0).notNull(),
	totalResourceConversions: integer("total_resource_conversions").default(0).notNull(),
	totalResourceRevenue: numeric("total_resource_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	totalInterest: integer("total_interest").default(0).notNull(),
	todayResourceClicks: integer("today_resource_clicks").default(0).notNull(),
	todayResourceConversions: integer("today_resource_conversions").default(0).notNull(),
	todayResourceRevenue: numeric("today_resource_revenue", { precision: 10, scale:  2 }).default('0').notNull(),
	todayInterest: integer("today_interest").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	type: text().default('PRODUCT').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "funnel_resource_analytics_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnels.id],
			name: "funnel_resource_analytics_funnel_id_funnels_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.resourceId],
			foreignColumns: [resources.id],
			name: "funnel_resource_analytics_resource_id_resources_id_fk"
		}).onDelete("cascade"),
]);

export const templates = pgTable("templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	experienceId: uuid("experience_id").notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	themeId: uuid("theme_id"),
	themeSnapshot: jsonb("theme_snapshot").notNull(),
	currentSeason: text("current_season").notNull(),
	isLive: boolean("is_live").default(false).notNull(),
	isLastEdited: boolean("is_last_edited").default(false).notNull(),
	templateData: jsonb("template_data").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isBannerImageBackground: boolean("is_banner_image_background").default(false).notNull(),
}, (table) => [
	index("templates_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("templates_experience_last_edited_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops"), table.isLastEdited.asc().nullsLast().op("uuid_ops")),
	index("templates_experience_live_idx").using("btree", table.experienceId.asc().nullsLast().op("bool_ops"), table.isLive.asc().nullsLast().op("uuid_ops")),
	index("templates_is_last_edited_idx").using("btree", table.isLastEdited.asc().nullsLast().op("bool_ops")),
	index("templates_is_live_idx").using("btree", table.isLive.asc().nullsLast().op("bool_ops")),
	index("templates_theme_id_idx").using("btree", table.themeId.asc().nullsLast().op("uuid_ops")),
	index("templates_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "templates_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.themeId],
			foreignColumns: [themes.id],
			name: "templates_theme_id_themes_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "templates_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("templates_experience_name_unique").on(table.experienceId, table.name),
]);

export const themes = pgTable("themes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	experienceId: uuid("experience_id").notNull(),
	name: text().notNull(),
	season: text().notNull(),
	themePrompt: text("theme_prompt"),
	accentColor: text("accent_color"),
	ringColor: text("ring_color"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	placeholderImage: text("placeholder_image"),
	mainHeader: text("main_header"),
	subHeader: text("sub_header"),
}, (table) => [
	index("themes_experience_id_idx").using("btree", table.experienceId.asc().nullsLast().op("uuid_ops")),
	index("themes_experience_season_idx").using("btree", table.experienceId.asc().nullsLast().op("text_ops"), table.season.asc().nullsLast().op("uuid_ops")),
	index("themes_season_idx").using("btree", table.season.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.experienceId],
			foreignColumns: [experiences.id],
			name: "themes_experience_id_experiences_id_fk"
		}).onDelete("cascade"),
]);
