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
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  whopCompanyId: text('whop_company_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  logo: text('logo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  whopCompanyIdIdx: index('companies_whop_company_id_idx').on(table.whopCompanyId),
}));

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  whopUserId: text('whop_user_id').notNull().unique(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  credits: integer('credits').default(2).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  whopUserIdIdx: index('users_whop_user_id_idx').on(table.whopUserId),
  companyIdIdx: index('users_company_id_idx').on(table.companyId),
}));

// ===== FUNNEL MANAGEMENT TABLES =====
export const funnels = pgTable('funnels', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
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
  companyIdIdx: index('funnels_company_id_idx').on(table.companyId),
  userIdIdx: index('funnels_user_id_idx').on(table.userId),
  isDeployedIdx: index('funnels_is_deployed_idx').on(table.isDeployed),
  generationStatusIdx: index('funnels_generation_status_idx').on(table.generationStatus),
}));

// ===== RESOURCE MANAGEMENT TABLES =====
export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
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
  companyIdIdx: index('resources_company_id_idx').on(table.companyId),
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
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  status: conversationStatusEnum('status').default('active').notNull(),
  currentBlockId: text('current_block_id'),
  userPath: jsonb('user_path'), // Track user's path through funnel
  metadata: jsonb('metadata'), // Additional conversation data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('conversations_company_id_idx').on(table.companyId),
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
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  views: integer('views').default(0).notNull(),
  starts: integer('starts').default(0).notNull(),
  completions: integer('completions').default(0).notNull(),
  conversions: integer('conversions').default(0).notNull(),
  revenue: decimal('revenue', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('funnel_analytics_company_id_idx').on(table.companyId),
  funnelIdIdx: index('funnel_analytics_funnel_id_idx').on(table.funnelId),
  dateIdx: index('funnel_analytics_date_idx').on(table.date),
  uniqueFunnelDate: unique('unique_funnel_date').on(table.funnelId, table.date),
}));

// ===== RELATIONS =====
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  funnels: many(funnels),
  resources: many(resources),
  conversations: many(conversations),
  funnelAnalytics: many(funnelAnalytics),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  funnels: many(funnels),
  resources: many(resources),
}));

export const funnelsRelations = relations(funnels, ({ one, many }) => ({
  company: one(companies, {
    fields: [funnels.companyId],
    references: [companies.id],
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
  company: one(companies, {
    fields: [resources.companyId],
    references: [companies.id],
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
  company: one(companies, {
    fields: [conversations.companyId],
    references: [companies.id],
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
  company: one(companies, {
    fields: [funnelAnalytics.companyId],
    references: [companies.id],
  }),
  funnel: one(funnels, {
    fields: [funnelAnalytics.funnelId],
    references: [funnels.id],
  }),
}));
