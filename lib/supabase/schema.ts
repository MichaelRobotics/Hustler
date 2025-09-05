import { 
  pgTable, 
  uuid, 
  text, 
  boolean, 
  integer, 
  decimal,
  timestamp, 
  jsonb,
  pgEnum,
  index,
  unique,
  check
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== ENUMS =====
export const resourceTypeEnum = pgEnum('resource_type', ['AFFILIATE', 'MY_PRODUCTS']);
export const resourceCategoryEnum = pgEnum('resource_category', ['PAID', 'FREE_VALUE']);
export const generationStatusEnum = pgEnum('generation_status', ['idle', 'generating', 'completed', 'failed']);
export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'completed', 'abandoned']);
export const messageTypeEnum = pgEnum('message_type', ['user', 'bot', 'system']);

// ===== CORE WHOP INTEGRATION TABLES =====
// Experiences represent app installations - the proper way to scope data in WHOP apps
export const experiences = pgTable('experiences', {
  id: uuid('id').defaultRandom().primaryKey(),
  whopExperienceId: text('whop_experience_id').notNull().unique(),
  whopCompanyId: text('whop_company_id').notNull(), // App creator's company (metadata only)
  name: text('name').notNull(),
  description: text('description'),
  logo: text('logo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  whopExperienceIdIdx: index('experiences_whop_experience_id_idx').on(table.whopExperienceId),
  whopCompanyIdIdx: index('experiences_whop_company_id_idx').on(table.whopCompanyId),
}));

// Companies table removed - using experiences for multitenancy

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  whopUserId: text('whop_user_id').notNull().unique(),
  experienceId: uuid('experience_id').notNull().references(() => experiences.id, { onDelete: 'cascade' }), // Experience-based scoping
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  credits: integer('credits').default(2).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  whopUserIdIdx: index('users_whop_user_id_idx').on(table.whopUserId),
  experienceIdIdx: index('users_experience_id_idx').on(table.experienceId),
}));

// ===== FUNNEL MANAGEMENT TABLES =====
export const funnels = pgTable('funnels', {
  id: uuid('id').defaultRandom().primaryKey(),
  experienceId: uuid('experience_id').notNull().references(() => experiences.id, { onDelete: 'cascade' }), // Experience-based scoping
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  flow: jsonb('flow'), // The complete funnel flow JSON
  isDeployed: boolean('is_deployed').default(false).notNull(),
  wasEverDeployed: boolean('was_ever_deployed').default(false).notNull(),
  generationStatus: generationStatusEnum('generation_status').default('idle').notNull(),
  sends: integer('sends').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  experienceIdIdx: index('funnels_experience_id_idx').on(table.experienceId),
  userIdIdx: index('funnels_user_id_idx').on(table.userId),
  isDeployedIdx: index('funnels_is_deployed_idx').on(table.isDeployed),
  generationStatusIdx: index('funnels_generation_status_idx').on(table.generationStatus),
}));

// ===== RESOURCE MANAGEMENT TABLES =====
export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  experienceId: uuid('experience_id').notNull().references(() => experiences.id, { onDelete: 'cascade' }), // Experience-based scoping
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: resourceTypeEnum('type').notNull(),
  category: resourceCategoryEnum('category').notNull(),
  link: text('link').notNull(),
  code: text('code'), // Promo code
  description: text('description'),
  whopProductId: text('whop_product_id'), // For MY_PRODUCTS sync
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  experienceIdIdx: index('resources_experience_id_idx').on(table.experienceId),
  userIdIdx: index('resources_user_id_idx').on(table.userId),
  typeIdx: index('resources_type_idx').on(table.type),
  whopProductIdIdx: index('resources_whop_product_id_idx').on(table.whopProductId),
}));

export const funnelResources = pgTable('funnel_resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  funnelIdIdx: index('funnel_resources_funnel_id_idx').on(table.funnelId),
  resourceIdIdx: index('funnel_resources_resource_id_idx').on(table.resourceId),
  uniqueFunnelResource: unique('unique_funnel_resource').on(table.funnelId, table.resourceId),
}));

// ===== LIVE CHAT & CONVERSATIONS =====
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  experienceId: uuid('experience_id').notNull().references(() => experiences.id, { onDelete: 'cascade' }), // Experience-based scoping
  funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  status: conversationStatusEnum('status').default('active').notNull(),
  currentBlockId: text('current_block_id'),
  userPath: jsonb('user_path'), // Track user's path through funnel
  metadata: jsonb('metadata'), // Additional conversation data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  experienceIdIdx: index('conversations_experience_id_idx').on(table.experienceId),
  funnelIdIdx: index('conversations_funnel_id_idx').on(table.funnelId),
  statusIdx: index('conversations_status_idx').on(table.status),
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  type: messageTypeEnum('type').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // Additional message data
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
  typeIdx: index('messages_type_idx').on(table.type),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
}));

export const funnelInteractions = pgTable('funnel_interactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  blockId: text('block_id').notNull(),
  optionText: text('option_text').notNull(),
  nextBlockId: text('next_block_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('funnel_interactions_conversation_id_idx').on(table.conversationId),
  blockIdIdx: index('funnel_interactions_block_id_idx').on(table.blockId),
}));

// ===== ANALYTICS TABLES =====
export const funnelAnalytics = pgTable('funnel_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  experienceId: uuid('experience_id').notNull().references(() => experiences.id, { onDelete: 'cascade' }), // Experience-based scoping
  funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  views: integer('views').default(0).notNull(),
  starts: integer('starts').default(0).notNull(),
  completions: integer('completions').default(0).notNull(),
  conversions: integer('conversions').default(0).notNull(),
  revenue: decimal('revenue', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  experienceIdIdx: index('funnel_analytics_experience_id_idx').on(table.experienceId),
  funnelIdIdx: index('funnel_analytics_funnel_id_idx').on(table.funnelId),
  dateIdx: index('funnel_analytics_date_idx').on(table.date),
  uniqueFunnelDate: unique('unique_funnel_date').on(table.funnelId, table.date),
}));

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

export const funnelResourcesRelations = relations(funnelResources, ({ one }) => ({
  funnel: one(funnels, {
    fields: [funnelResources.funnelId],
    references: [funnels.id],
  }),
  resource: one(resources, {
    fields: [funnelResources.resourceId],
    references: [resources.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
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
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const funnelInteractionsRelations = relations(funnelInteractions, ({ one }) => ({
  conversation: one(conversations, {
    fields: [funnelInteractions.conversationId],
    references: [conversations.id],
  }),
}));

export const funnelAnalyticsRelations = relations(funnelAnalytics, ({ one }) => ({
  experience: one(experiences, {
    fields: [funnelAnalytics.experienceId],
    references: [experiences.id],
  }),
  funnel: one(funnels, {
    fields: [funnelAnalytics.funnelId],
    references: [funnels.id],
  }),
}));
