import { pgTable, uuid, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Funnels Table - Core funnel definitions with versioning
export const funnels = pgTable('funnels', {
  id: uuid('id').primaryKey().defaultRandom(),
  experience_id: text('experience_id').notNull(),
  name: text('name').notNull(),
  flow: jsonb('flow'), // JSON structure for funnel flow
  is_deployed: boolean('is_deployed').default(false),
  version: integer('version').default(1),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Resources Table - Affiliate links, products, community resources
export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  experience_id: text('experience_id').notNull(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  type: text('type').notNull(), // 'affiliate', 'my_product', 'community'
  promo_code: text('promo_code'),
  created_at: timestamp('created_at').defaultNow()
});

// Sessions Table - User interaction state and progress tracking
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  experience_id: text('experience_id').notNull(),
  user_id: text('user_id').notNull(),
  funnel_id: uuid('funnel_id').references(() => funnels.id),
  current_stage: text('current_stage'),
  progress: jsonb('progress'), // JSON structure for session progress
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// DM Interactions Table - Detailed conversation and event logging
export const dm_interactions = pgTable('dm_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  experience_id: text('experience_id').notNull(),
  session_id: uuid('session_id').references(() => sessions.id),
  user_id: text('user_id').notNull(),
  interaction_type: text('interaction_type').notNull(), // 'message_sent', 'message_received', 'link_clicked', 'purchase_made'
  content: text('content'),
  stage_id: text('stage_id'),
  block_id: text('block_id'),
  metadata: jsonb('metadata'), // Additional data like link clicks, purchases, etc.
  created_at: timestamp('created_at').defaultNow()
});

// Generation Packs Table - AI generation credit packages
export const generation_packs = pgTable('generation_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  experience_id: text('experience_id').notNull(),
  name: text('name').notNull(),
  generations: integer('generations').notNull(),
  price: integer('price').notNull(), // Price in cents
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow()
});

// User Generations Table - Individual user credit balances
export const user_generations = pgTable('user_generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  experience_id: text('experience_id').notNull(),
  user_id: text('user_id').notNull(),
  balance: integer('balance').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Tracking Events Table - Conversion and revenue analytics
export const tracking_events = pgTable('tracking_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  experience_id: text('experience_id').notNull(),
  user_id: text('user_id').notNull(),
  funnel_id: uuid('funnel_id').references(() => funnels.id),
  resource_id: uuid('resource_id').references(() => resources.id),
  event_type: text('event_type').notNull(), // 'click', 'purchase', 'conversion'
  amount: integer('amount'), // Purchase amount in cents
  created_at: timestamp('created_at').defaultNow()
});

// Define relationships for type safety and query optimization
export const funnelsRelations = relations(funnels, ({ many }) => ({
  sessions: many(sessions),
  trackingEvents: many(tracking_events)
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  funnel: one(funnels, {
    fields: [sessions.funnel_id],
    references: [funnels.id]
  }),
  dmInteractions: many(dm_interactions)
}));

export const dmInteractionsRelations = relations(dm_interactions, ({ one }) => ({
  session: one(sessions, {
    fields: [dm_interactions.session_id],
    references: [sessions.id]
  })
}));

export const resourcesRelations = relations(resources, ({ many }) => ({
  trackingEvents: many(tracking_events)
}));

export const trackingEventsRelations = relations(tracking_events, ({ one }) => ({
  funnel: one(funnels, {
    fields: [tracking_events.funnel_id],
    references: [funnels.id]
  }),
  resource: one(resources, {
    fields: [tracking_events.resource_id],
    references: [resources.id]
  })
}));

// Export types for use in the application
export type Funnel = typeof funnels.$inferSelect;
export type NewFunnel = typeof funnels.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type DMInteraction = typeof dm_interactions.$inferSelect;
export type NewDMInteraction = typeof dm_interactions.$inferInsert;
export type GenerationPack = typeof generation_packs.$inferSelect;
export type NewGenerationPack = typeof generation_packs.$inferInsert;
export type UserGeneration = typeof user_generations.$inferSelect;
export type NewUserGeneration = typeof user_generations.$inferInsert;
export type TrackingEvent = typeof tracking_events.$inferSelect;
export type NewTrackingEvent = typeof tracking_events.$inferInsert;



