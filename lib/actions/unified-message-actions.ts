/**
 * Unified Message Actions
 * 
 * Centralized message loading logic for both UserChat and LiveChat components.
 * Provides a single source of truth for message formatting and loading.
 */

import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { messages, conversations, experiences } from "../supabase/schema";

export interface UnifiedMessage {
  id: string;
  conversationId: string;
  type: "user" | "bot" | "system";
  content: string;
  text: string; // Alias for content
  timestamp: string; // Alias for createdAt
  createdAt: Date;
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
      content: msg.content,
      text: msg.content, // Alias for content
      timestamp: msg.createdAt, // Alias for createdAt
      createdAt: msg.createdAt,
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
 * Get conversation messages filtered for customer view
 * Only shows messages starting from the first bot message in EXPERIENCE_QUALIFICATION stage
 * 
 * @param conversationId - ID of the conversation
 * @param experienceId - Experience ID for multi-tenant isolation
 * @param whopUserId - Whop user ID for multi-tenant isolation
 * @returns Filtered messages starting from EXPERIENCE_QUALIFICATION
 */
export async function getConversationMessagesForCustomer(
  conversationId: string,
  experienceId: string,
  whopUserId?: string
): Promise<UnifiedMessage[]> {
  try {
    console.log(`[UNIFIED-MESSAGES] Getting customer-filtered messages for conversation ${conversationId}`);

    // Get experience
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      throw new Error(`Experience not found: ${experienceId}`);
    }

    // Get conversation with funnel
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experience.id)
      ),
      with: {
        funnel: true,
      },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    if (!conversation.funnel?.flow) {
      throw new Error(`Funnel not found for conversation: ${conversationId}`);
    }

    const funnelFlow = conversation.funnel.flow as any;

    // Find EXPERIENCE_QUALIFICATION stage
    const experienceQualStage = funnelFlow.stages?.find(
      (stage: any) => stage.name === "EXPERIENCE_QUALIFICATION"
    );

    if (!experienceQualStage || !experienceQualStage.blockIds?.length) {
      console.log(`[UNIFIED-MESSAGES] No EXPERIENCE_QUALIFICATION stage found, returning all messages`);
      // If no EXPERIENCE_QUALIFICATION stage, return all messages
      return getConversationMessages(conversationId, experienceId, whopUserId);
    }

    // Get the first EXPERIENCE_QUALIFICATION block ID
    const firstExperienceQualBlockId = experienceQualStage.blockIds[0];

    // Get all messages for the conversation
    const allMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [asc(messages.createdAt)],
    });

    // Find the first bot message from EXPERIENCE_QUALIFICATION stage
    let experienceQualStartIndex = -1;
    
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      
      // Check if this is a bot message with the EXPERIENCE_QUALIFICATION block ID
      if (msg.type === "bot" && 
          msg.metadata?.blockId === firstExperienceQualBlockId) {
        experienceQualStartIndex = i;
        console.log(`[UNIFIED-MESSAGES] Found EXPERIENCE_QUALIFICATION start at message index ${i}`);
        break;
      }
    }

    // If no EXPERIENCE_QUALIFICATION bot message found, return all messages
    if (experienceQualStartIndex === -1) {
      console.log(`[UNIFIED-MESSAGES] No EXPERIENCE_QUALIFICATION bot message found, returning all messages`);
      return getConversationMessages(conversationId, experienceId, whopUserId);
    }

    // Filter messages starting from EXPERIENCE_QUALIFICATION
    const filteredMessages = allMessages.slice(experienceQualStartIndex);
    
    console.log(`[UNIFIED-MESSAGES] Filtered ${filteredMessages.length} messages from EXPERIENCE_QUALIFICATION stage`);

    // Convert to unified format
    const unifiedMessages: UnifiedMessage[] = filteredMessages.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      type: msg.type === "bot" ? "bot" : msg.type === "user" ? "user" : "system",
      content: msg.content,
      text: msg.content, // Alias for content
      timestamp: msg.createdAt, // Alias for createdAt
      isRead: true,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    }));

    return unifiedMessages;

  } catch (error) {
    console.error(`[UNIFIED-MESSAGES] Error getting customer-filtered messages for conversation ${conversationId}:`, error);
    throw error;
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