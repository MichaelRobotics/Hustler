/**
 * Experience Context System for Webhook Analytics
 * 
 * This module handles linking webhooks to specific app installations
 * and finding conversations for analytics updates.
 */

import { db } from "@/lib/supabase/db-server";
import { experiences, conversations } from "@/lib/supabase/schema";
import { eq, and, desc } from "drizzle-orm";

export interface ExperienceContext {
  experienceId: string;
  whopCompanyId: string;
  name: string;
  status: string;
}

export interface ConversationContext {
  conversationId: string;
  funnelId: string;
  experienceId: string;
  whopUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get experience from company ID using existing multi-tenancy system
 */
export async function getExperienceFromCompanyId(companyId: string): Promise<ExperienceContext | null> {
  try {
    console.log(`[Experience Context] Looking up experience for company: ${companyId}`);
    
    // Check if this is actually a whopExperienceId (starts with 'exp_')
    let experience;
    if (companyId.startsWith('exp_')) {
      // This is a whopExperienceId, not a companyId
      console.log(`[Experience Context] Detected whopExperienceId: ${companyId}`);
      experience = await db.query.experiences.findFirst({
        where: eq(experiences.whopExperienceId, companyId),
      });
    } else {
      // This is a whopCompanyId
      experience = await db.query.experiences.findFirst({
        where: eq(experiences.whopCompanyId, companyId),
      });
    }

    if (!experience) {
      console.log(`[Experience Context] No experience found for: ${companyId}`);
      return null;
    }

    console.log(`[Experience Context] Found experience: ${experience.id} for: ${companyId}`);
    return {
      experienceId: experience.id,
      whopCompanyId: experience.whopCompanyId,
      name: experience.name,
      status: experience.status
    };
  } catch (error) {
    console.error(`[Experience Context] Error looking up experience for ${companyId}:`, error);
    return null;
  }
}

/**
 * Find conversation for user in specific experience
 */
export async function findConversationForUser(
  experienceId: string, 
  userId: string
): Promise<ConversationContext | null> {
  try {
    console.log(`[Experience Context] Looking up conversation for user ${userId} in experience ${experienceId}`);
    
    // Find conversation in specific experience
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.experienceId, experienceId),
        eq(conversations.whopUserId, userId)
      ),
      orderBy: [desc(conversations.createdAt)]
    });

    if (!conversation) {
      console.log(`[Experience Context] No conversation found for user ${userId} in experience ${experienceId}`);
      return null;
    }

    if (!conversation.funnelId) {
      console.log(`[Experience Context] Conversation ${conversation.id} has no funnelId`);
      return null;
    }

    console.log(`[Experience Context] Found conversation: ${conversation.id} with funnel: ${conversation.funnelId}`);
    return {
      conversationId: conversation.id,
      funnelId: conversation.funnelId,
      experienceId: conversation.experienceId,
      whopUserId: conversation.whopUserId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  } catch (error) {
    console.error(`[Experience Context] Error finding conversation for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get experience context from webhook data
 */
export async function getExperienceContextFromWebhook(webhookData: any): Promise<{
  experience: ExperienceContext | null;
  conversation: ConversationContext | null;
}> {
  try {
    const companyId = webhookData.company_id;
    const userId = webhookData.user_id;

    if (!companyId || !userId) {
      console.log('[Experience Context] Missing companyId or userId in webhook data');
      return { experience: null, conversation: null };
    }

    // Get experience from company ID
    const experience = await getExperienceFromCompanyId(companyId);
    
    if (!experience) {
      console.log('[Experience Context] No experience found for webhook');
      return { experience: null, conversation: null };
    }

    // Find conversation for user in this experience
    const conversation = await findConversationForUser(experience.experienceId, userId);

    return { experience, conversation };
  } catch (error) {
    console.error('[Experience Context] Error getting experience context from webhook:', error);
    return { experience: null, conversation: null };
  }
}

/**
 * Validate experience context
 */
export function validateExperienceContext(
  experience: ExperienceContext | null,
  conversation: ConversationContext | null
): boolean {
  if (!experience) {
    console.log('[Experience Context] No experience found');
    return false;
  }

  if (!conversation) {
    console.log('[Experience Context] No conversation found');
    return false;
  }

  if (!conversation.funnelId) {
    console.log('[Experience Context] Conversation has no funnelId');
    return false;
  }

  return true;
}

