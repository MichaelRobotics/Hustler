/**
 * Unified Message Actions
 * 
 * Centralized message loading logic for both UserChat and LiveChat components.
 * Provides a single source of truth for message formatting and loading.
 */

import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { messages, conversations } from "../supabase/schema";

export interface UnifiedMessage {
  id: string;
  conversationId: string;
  type: "user" | "bot" | "system";
  text: string;
  timestamp: string;
  isRead: boolean;
  metadata?: any;
}

/**
 * Get conversation messages in unified format
 * 
 * @param conversationId - ID of the conversation
 * @param experienceId - Experience ID for multi-tenant isolation
 * @param whopUserId - Whop user ID (optional, for additional filtering)
 * @returns Array of unified messages
 */
export async function getConversationMessages(
  conversationId: string,
  experienceId: string,
  whopUserId?: string
): Promise<UnifiedMessage[]> {
  try {
    // First, verify the conversation exists and belongs to the experience
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
    });

    if (!conversation) {
      console.error(`Conversation ${conversationId} not found for experience ${experienceId}`);
      return [];
    }

    // Get all messages for this conversation, ordered by creation time
    const conversationMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [asc(messages.createdAt)],
    });

    // Transform to unified format
    const unifiedMessages: UnifiedMessage[] = conversationMessages.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      type: msg.type === "bot" ? "bot" : msg.type === "user" ? "user" : "system",
      text: msg.content,
      timestamp: msg.createdAt,
      isRead: true, // For now, assume all messages are read
      metadata: msg.metadata,
    }));

    console.log(`[UNIFIED-MESSAGES] Loaded ${unifiedMessages.length} messages for conversation ${conversationId}`);
    return unifiedMessages;

  } catch (error) {
    console.error(`[UNIFIED-MESSAGES] Error loading messages for conversation ${conversationId}:`, error);
    return [];
  }
}

/**
 * Get conversation messages with version checking (simplified)
 * 
 * @param conversationId - ID of the conversation
 * @param experienceId - Experience ID for multi-tenant isolation
 * @param lastSyncVersion - Last sync version (optional)
 * @returns Object with messages and version info
 */
export async function getConversationMessagesWithVersion(
  conversationId: string,
  experienceId: string,
  lastSyncVersion?: number
): Promise<{ messages: UnifiedMessage[]; version: number; hasUpdates: boolean }> {
  try {
    const messages = await getConversationMessages(conversationId, experienceId);
    
    // Use max message ID as simple version proxy
    const latestVersion = messages.length > 0 
      ? Math.max(...messages.map(m => parseInt(m.id.split('-').pop() || '0')))
      : 0;
    
    const hasUpdates = lastSyncVersion ? latestVersion > lastSyncVersion : true;
    
    return {
      messages,
      version: latestVersion,
      hasUpdates
    };
  } catch (error) {
    console.error(`[UNIFIED-MESSAGES] Error loading messages with version for conversation ${conversationId}:`, error);
    return {
      messages: [],
      version: 0,
      hasUpdates: false
    };
  }
}

/**
 * Get conversation messages filtered for customer access level
 * Only shows messages starting from EXPERIENCE_QUALIFICATION stage
 * 
 * @param conversationId - ID of the conversation
 * @param experienceId - Experience ID for multi-tenant isolation
 * @param whopUserId - Whop user ID (optional, for additional filtering)
 * @returns Array of unified messages filtered for customer view
 */
export async function getConversationMessagesForCustomer(
  conversationId: string,
  experienceId: string,
  whopUserId?: string
): Promise<UnifiedMessage[]> {
  try {
    // First, verify the conversation exists and belongs to the experience
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
      with: {
        funnel: true,
      },
    });

    if (!conversation) {
      console.error(`Conversation ${conversationId} not found for experience ${experienceId}`);
      return [];
    }

    if (!conversation.funnel?.flow) {
      console.error(`No funnel flow found for conversation ${conversationId}`);
      return [];
    }

    const funnelFlow = conversation.funnel.flow as any;

    // Find the EXPERIENCE_QUALIFICATION stage
    const experienceQualStage = funnelFlow.stages?.find(
      (stage: any) => stage.name === "EXPERIENCE_QUALIFICATION"
    );

    if (!experienceQualStage || !experienceQualStage.blockIds?.length) {
      console.error(`No EXPERIENCE_QUALIFICATION stage found for conversation ${conversationId}`);
      return [];
    }

    const firstExperienceBlockId = experienceQualStage.blockIds[0];

    // Get all messages for this conversation, ordered by creation time
    const conversationMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [asc(messages.createdAt)],
    });

    // Find the first bot message that belongs to EXPERIENCE_QUALIFICATION stage
    let startIndex = -1;
    for (let i = 0; i < conversationMessages.length; i++) {
      const msg = conversationMessages[i];
      if (msg.type === "bot" && msg.metadata?.blockId === firstExperienceBlockId) {
        startIndex = i;
        break;
      }
    }

    // If no EXPERIENCE_QUALIFICATION bot message found, return empty array
    if (startIndex === -1) {
      console.log(`No EXPERIENCE_QUALIFICATION bot message found for conversation ${conversationId}`);
      return [];
    }

    // Filter messages starting from the EXPERIENCE_QUALIFICATION stage
    const filteredMessages = conversationMessages.slice(startIndex);

    // Transform to unified format
    const unifiedMessages: UnifiedMessage[] = filteredMessages.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      type: msg.type === "bot" ? "bot" : msg.type === "user" ? "user" : "system",
      text: msg.content,
      timestamp: msg.createdAt,
      isRead: true, // For now, assume all messages are read
      metadata: msg.metadata,
    }));

    console.log(`[UNIFIED-MESSAGES-CUSTOMER] Loaded ${unifiedMessages.length} filtered messages for conversation ${conversationId} (starting from EXPERIENCE_QUALIFICATION)`);
    return unifiedMessages;

  } catch (error) {
    console.error(`[UNIFIED-MESSAGES-CUSTOMER] Error loading filtered messages for conversation ${conversationId}:`, error);
    return [];
  }
}

/**
 * Update conversation timestamp (simplified versioning)
 * 
 * @param conversationId - ID of the conversation
 * @param experienceId - Experience ID for multi-tenant isolation
 */
export async function updateConversationTimestamp(
  conversationId: string,
  experienceId: string
): Promise<void> {
  try {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.experienceId, experienceId)
        )
      );
  } catch (error) {
    console.error(`[UNIFIED-MESSAGES] Error updating conversation timestamp for ${conversationId}:`, error);
  }
}