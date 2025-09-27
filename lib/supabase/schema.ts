import { relations, eq } from "drizzle-orm";
import {
	boolean,
	check,
	decimal,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

// ===== ENUMS =====
export const resourceTypeEnum = pgEnum("resource_type", [
	"AFFILIATE",
	"MY_PRODUCTS",
]);
export const resourceCategoryEnum = pgEnum("resource_category", [
	"PAID",
	"FREE_VALUE",
]);
export const generationStatusEnum = pgEnum("generation_status", [
	"idle",
	"generating",
	"completed",
	"failed",
]);
export const conversationStatusEnum = pgEnum("conversation_status", [
	"active",
	"completed",
	"closed",
	"abandoned",
]);
export const messageTypeEnum = pgEnum("message_type", [
	"user",
	"bot",
]);

// ===== CORE WHOP INTEGRATION TABLES =====
// Experiences represent app installations - the proper way to scope data in WHOP apps
export const experiences = pgTable(
	"experiences",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		whopExperienceId: text("whop_experience_id").notNull().unique(),
		whopCompanyId: text("whop_company_id").notNull(), 
		name: text("name").notNull(),
		description: text("description"),
		logo: text("logo"),
		link: text("link"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		whopExperienceIdIdx: index("experiences_whop_experience_id_idx").on(
			table.whopExperienceId,
		),
		whopCompanyIdIdx: index("experiences_whop_company_id_idx").on(
			table.whopCompanyId,
		),
		updatedAtIdx: index("experiences_updated_at_idx").on(table.updatedAt),
	}),
);

// Companies table removed - using experiences for multitenancy

export const users = pgTable(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		whopUserId: text("whop_user_id").notNull(),
		experienceId: uuid("experience_id")
			.notNull()
			.references(() => experiences.id, { onDelete: "cascade" }), // Experience-based scoping
		email: text("email").notNull(),
		name: text("name").notNull(),
		avatar: text("avatar"),
		credits: integer("credits").default(0).notNull(),
		accessLevel: text("access_level").notNull().default("customer"), // WHOP access level: admin/customer/no_access
		productsSynced: boolean("products_synced").default(false).notNull(), // Track if products have been synced for this user
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		whopUserIdIdx: index("users_whop_user_id_idx").on(table.whopUserId),
		experienceIdIdx: index("users_experience_id_idx").on(table.experienceId),
		experienceUpdatedIdx: index("users_experience_updated_idx").on(
			table.experienceId,
			table.updatedAt,
		),
		accessLevelIdx: index("users_access_level_idx").on(table.accessLevel),
		experienceAccessLevelIdx: index("users_experience_access_level_idx").on(
			table.experienceId,
			table.accessLevel,
		),
		// Unique constraint: one user record per whop_user_id per experience
		whopUserExperienceUnique: unique("users_whop_user_experience_unique").on(
			table.whopUserId,
			table.experienceId,
		),
	}),
);

// ===== FUNNEL MANAGEMENT TABLES =====
export const funnels = pgTable(
	"funnels",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		experienceId: uuid("experience_id")
			.notNull()
			.references(() => experiences.id, { onDelete: "cascade" }), // Experience-based scoping
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		flow: jsonb("flow"), // The complete funnel flow JSON
		visualizationState: jsonb("visualization_state").default("{}"), // User visualization preferences and layout
		whopProductId: text("whop_product_id"), // Discovery page product ID (accessPass.id)
		isDeployed: boolean("is_deployed").default(false).notNull(),
		wasEverDeployed: boolean("was_ever_deployed").default(false).notNull(),
		generationStatus: generationStatusEnum("generation_status")
			.default("idle")
			.notNull(),
		sends: integer("sends").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		experienceIdIdx: index("funnels_experience_id_idx").on(table.experienceId),
		userIdIdx: index("funnels_user_id_idx").on(table.userId),
		whopProductIdIdx: index("funnels_whop_product_id_idx").on(table.whopProductId),
		isDeployedIdx: index("funnels_is_deployed_idx").on(table.isDeployed),
		generationStatusIdx: index("funnels_generation_status_idx").on(
			table.generationStatus,
		),
		visualizationStateIdx: index("funnels_visualization_state_idx").using(
			"gin",
			table.visualizationState,
		),
		experienceUserUpdatedIdx: index("funnels_experience_user_updated_idx").on(
			table.experienceId,
			table.userId,
			table.updatedAt,
		),
		experienceDeployedIdx: index("funnels_experience_deployed_idx").on(
			table.experienceId,
			table.isDeployed,
		),
		experienceProductDeployedIdx: index("funnels_experience_product_deployed_idx").on(
			table.experienceId,
			table.whopProductId,
			table.isDeployed,
		),
	}),
);

// ===== RESOURCE MANAGEMENT TABLES =====
export const resources = pgTable(
	"resources",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		experienceId: uuid("experience_id")
			.notNull()
			.references(() => experiences.id, { onDelete: "cascade" }), // Experience-based scoping
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		type: resourceTypeEnum("type").notNull(),
		category: resourceCategoryEnum("category").notNull(),
		link: text("link").notNull(),
		code: text("code"), // Promo code
		description: text("description"),
		whopProductId: text("whop_product_id"), // For MY_PRODUCTS sync
		whopAppId: text("whop_app_id"), // For app-based products
		whopMembershipId: text("whop_membership_id"), // For membership-based products
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		experienceIdIdx: index("resources_experience_id_idx").on(
			table.experienceId,
		),
		userIdIdx: index("resources_user_id_idx").on(table.userId),
		typeIdx: index("resources_type_idx").on(table.type),
		whopProductIdIdx: index("resources_whop_product_id_idx").on(
			table.whopProductId,
		),
		whopAppIdIdx: index("resources_whop_app_id_idx").on(table.whopAppId),
		whopMembershipIdIdx: index("resources_whop_membership_id_idx").on(table.whopMembershipId),
		experienceUserUpdatedIdx: index("resources_experience_user_updated_idx").on(
			table.experienceId,
			table.userId,
			table.updatedAt,
		),
		typeCategoryIdx: index("resources_type_category_idx").on(
			table.type,
			table.category,
		),
	}),
);

export const funnelResources = pgTable(
	"funnel_resources",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		funnelId: uuid("funnel_id")
			.notNull()
			.references(() => funnels.id, { onDelete: "cascade" }),
		resourceId: uuid("resource_id")
			.notNull()
			.references(() => resources.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		funnelIdIdx: index("funnel_resources_funnel_id_idx").on(table.funnelId),
		resourceIdIdx: index("funnel_resources_resource_id_idx").on(
			table.resourceId,
		),
		uniqueFunnelResource: unique("unique_funnel_resource").on(
			table.funnelId,
			table.resourceId,
		),
	}),
);

// ===== LIVE CHAT & CONVERSATIONS =====
export const conversations = pgTable(
	"conversations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		experienceId: uuid("experience_id")
			.notNull()
			.references(() => experiences.id, { onDelete: "cascade" }), // Experience-based scoping
		funnelId: uuid("funnel_id")
			.notNull()
			.references(() => funnels.id, { onDelete: "cascade" }),
		whopUserId: text("whop_user_id").notNull(), // Direct Whop user ID for user identification
		membershipId: text("membership_id"), // Whop membership ID for DM operations
		status: conversationStatusEnum("status").default("active").notNull(),
		currentBlockId: text("current_block_id"),
		userPath: jsonb("user_path"), // Track user's path through funnel
		phase2StartTime: timestamp("phase2_start_time"), // When Phase 2 (VALUE_DELIVERY) begins
		myAffiliateLink: text("my_affiliate_link"), // Affiliate link for this conversation
		affiliateSend: boolean("affiliate_send").default(false).notNull(), // Track if affiliate DM was sent
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		experienceIdIdx: index("conversations_experience_id_idx").on(
			table.experienceId,
		),
		funnelIdIdx: index("conversations_funnel_id_idx").on(table.funnelId),
		whopUserIdIdx: index("conversations_whop_user_id_idx").on(table.whopUserId),
		statusIdx: index("conversations_status_idx").on(table.status),
		// Unique constraint for one active conversation per whop_user per experience
		uniqueActiveUserConversation: unique("unique_active_user_conversation").on(
			table.experienceId,
			table.whopUserId,
		),
	}),
);

export const messages = pgTable(
	"messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		type: messageTypeEnum("type").notNull(),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		conversationIdIdx: index("messages_conversation_id_idx").on(
			table.conversationId,
		),
		typeIdx: index("messages_type_idx").on(table.type),
		createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
	}),
);

export const funnelInteractions = pgTable(
	"funnel_interactions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		blockId: text("block_id").notNull(),
		optionText: text("option_text").notNull(),
		nextBlockId: text("next_block_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		conversationIdIdx: index("funnel_interactions_conversation_id_idx").on(
			table.conversationId,
		),
		blockIdIdx: index("funnel_interactions_block_id_idx").on(table.blockId),
	}),
);

// ===== ANALYTICS TABLES =====
export const funnelAnalytics = pgTable(
	"funnel_analytics",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		experienceId: uuid("experience_id")
			.notNull()
			.references(() => experiences.id, { onDelete: "cascade" }),
		funnelId: uuid("funnel_id")
			.notNull()
			.references(() => funnels.id, { onDelete: "cascade" }),
		// Overall metrics (lifetime)
		totalStarts: integer("total_starts").default(0).notNull(),
		totalIntent: integer("total_intent").default(0).notNull(),
		totalConversions: integer("total_conversions").default(0).notNull(),
		totalAffiliateRevenue: decimal("total_affiliate_revenue", { precision: 10, scale: 2 })
			.default("0")
			.notNull(),
		totalProductRevenue: decimal("total_product_revenue", { precision: 10, scale: 2 })
			.default("0")
			.notNull(),
		totalInterest: integer("total_interest").default(0).notNull(),
		// Today's metrics
		todayStarts: integer("today_starts").default(0).notNull(),
		todayIntent: integer("today_intent").default(0).notNull(),
		todayConversions: integer("today_conversions").default(0).notNull(),
		todayAffiliateRevenue: decimal("today_affiliate_revenue", { precision: 10, scale: 2 })
			.default("0")
			.notNull(),
		todayProductRevenue: decimal("today_product_revenue", { precision: 10, scale: 2 })
			.default("0")
			.notNull(),
		todayInterest: integer("today_interest").default(0).notNull(),
		// Yesterday's metrics (for growth calculations)
		yesterdayStarts: integer("yesterday_starts").default(0).notNull(),
		yesterdayIntent: integer("yesterday_intent").default(0).notNull(),
		yesterdayConversions: integer("yesterday_conversions").default(0).notNull(),
		yesterdayInterest: integer("yesterday_interest").default(0).notNull(),
		// Growth/Loss percentage fields
		startsGrowthPercent: decimal("starts_growth_percent", { precision: 5, scale: 2 })
			.default("0")
			.notNull(),
		intentGrowthPercent: decimal("intent_growth_percent", { precision: 5, scale: 2 })
			.default("0")
			.notNull(),
		conversionsGrowthPercent: decimal("conversions_growth_percent", { precision: 5, scale: 2 })
			.default("0")
			.notNull(),
		interestGrowthPercent: decimal("interest_growth_percent", { precision: 5, scale: 2 })
			.default("0")
			.notNull(),
		lastUpdated: timestamp("last_updated").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		experienceIdIdx: index("funnel_analytics_experience_id_idx").on(
			table.experienceId,
		),
		funnelIdIdx: index("funnel_analytics_funnel_id_idx").on(table.funnelId),
		lastUpdatedIdx: index("funnel_analytics_last_updated_idx").on(table.lastUpdated),
		totalRevenueIdx: index("funnel_analytics_total_revenue_idx").on(table.totalAffiliateRevenue, table.totalProductRevenue),
		uniqueFunnel: unique("unique_funnel").on(table.funnelId),
	}),
);

// ===== RESOURCE ANALYTICS TABLE =====
// Note: This table already exists in the database, so we don't define it here
// to avoid constraint conflicts during migration
export const funnelResourceAnalytics = pgTable(
	"funnel_resource_analytics",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		experienceId: uuid("experience_id")
			.notNull()
			.references(() => experiences.id, { onDelete: "cascade" }),
		funnelId: uuid("funnel_id")
			.notNull()
			.references(() => funnels.id, { onDelete: "cascade" }),
		resourceId: uuid("resource_id")
			.notNull()
			.references(() => resources.id, { onDelete: "cascade" }),
		// Overall metrics (lifetime)
		totalResourceClicks: integer("total_resource_clicks").default(0).notNull(),
		totalResourceConversions: integer("total_resource_conversions").default(0).notNull(),
		totalResourceRevenue: decimal("total_resource_revenue", { precision: 10, scale: 2 })
			.default("0")
			.notNull(),
		totalInterest: integer("total_interest").default(0).notNull(),
		// Today's metrics
		todayResourceClicks: integer("today_resource_clicks").default(0).notNull(),
		todayResourceConversions: integer("today_resource_conversions").default(0).notNull(),
		todayResourceRevenue: decimal("today_resource_revenue", { precision: 10, scale: 2 })
			.default("0")
			.notNull(),
		todayInterest: integer("today_interest").default(0).notNull(),
		type: text("type").notNull().default("PRODUCT"),
		lastUpdated: timestamp("last_updated").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		// No constraints or indexes defined here to avoid conflicts
		// The table already exists in the database
	}),
);

// ===== RELATIONS =====
export const experiencesRelations = relations(experiences, ({ many }) => ({
	users: many(users),
	funnels: many(funnels),
	resources: many(resources),
	conversations: many(conversations),
	funnelAnalytics: many(funnelAnalytics),
}));

// Companies relations removed - using experiences for multitenancy

export const usersRelations = relations(users, ({ one, many }) => ({
	experience: one(experiences, {
		fields: [users.experienceId],
		references: [experiences.id],
	}),
	funnels: many(funnels),
	resources: many(resources),
}));

export const funnelsRelations = relations(funnels, ({ one, many }) => ({
	experience: one(experiences, {
		fields: [funnels.experienceId],
		references: [experiences.id],
	}),
	user: one(users, {
		fields: [funnels.userId],
		references: [users.id],
	}),
	funnelResources: many(funnelResources),
	conversations: many(conversations),
	funnelAnalytics: many(funnelAnalytics),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
	experience: one(experiences, {
		fields: [resources.experienceId],
		references: [experiences.id],
	}),
	user: one(users, {
		fields: [resources.userId],
		references: [users.id],
	}),
	funnelResources: many(funnelResources),
}));

export const funnelResourcesRelations = relations(
	funnelResources,
	({ one }) => ({
		funnel: one(funnels, {
			fields: [funnelResources.funnelId],
			references: [funnels.id],
		}),
		resource: one(resources, {
			fields: [funnelResources.resourceId],
			references: [resources.id],
		}),
	}),
);

export const conversationsRelations = relations(
	conversations,
	({ one, many }) => ({
		experience: one(experiences, {
			fields: [conversations.experienceId],
			references: [experiences.id],
		}),
		funnel: one(funnels, {
			fields: [conversations.funnelId],
			references: [funnels.id],
		}),
		messages: many(messages),
		funnelInteractions: many(funnelInteractions),
	}),
);

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
}));

export const funnelInteractionsRelations = relations(
	funnelInteractions,
	({ one }) => ({
		conversation: one(conversations, {
			fields: [funnelInteractions.conversationId],
			references: [conversations.id],
		}),
	}),
);

export const funnelAnalyticsRelations = relations(
	funnelAnalytics,
	({ one }) => ({
		experience: one(experiences, {
			fields: [funnelAnalytics.experienceId],
			references: [experiences.id],
		}),
		funnel: one(funnels, {
			fields: [funnelAnalytics.funnelId],
			references: [funnels.id],
		}),
	}),
);

export const funnelResourceAnalyticsRelations = relations(
	funnelResourceAnalytics,
	({ one }) => ({
		experience: one(experiences, {
			fields: [funnelResourceAnalytics.experienceId],
			references: [experiences.id],
		}),
		funnel: one(funnels, {
			fields: [funnelResourceAnalytics.funnelId],
			references: [funnels.id],
		}),
		resource: one(resources, {
			fields: [funnelResourceAnalytics.resourceId],
			references: [resources.id],
		}),
	}),
);
