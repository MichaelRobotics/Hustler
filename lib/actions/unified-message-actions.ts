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
    console.log(`[UNIFIED-MESSAGES] Sample messages:`, unifiedMessages.slice(0, 3).map(m => ({
      id: m.id,
      type: m.type,
      text: m.text ? m.text.substring(0, 50) + (m.text.length > 50 ? '...' : '') : 'no text',
      timestamp: m.timestamp
    })));
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
 * Filter messages to show only those from EXPERIENCE_QUALIFICATION stage onwards
 * This is used for customer access level to hide DM funnel messages
 * 
 * @param messages - Array of unified messages
 * @param funnelFlow - Funnel flow to determine stage boundaries
 * @returns Filtered messages starting from EXPERIENCE_QUALIFICATION
 */
export function filterMessagesFromExperienceQualification(
  messages: UnifiedMessage[],
  funnelFlow: any
): UnifiedMessage[] {
  if (!funnelFlow || !funnelFlow.stages) {
    console.log("[UNIFIED-MESSAGES] No funnel flow provided, returning all messages");
    return messages;
  }

  // Find the EXPERIENCE_QUALIFICATION stage
  const experienceQualificationStage = funnelFlow.stages.find(
    (stage: any) => stage.name === "EXPERIENCE_QUALIFICATION"
  );

  if (!experienceQualificationStage || !experienceQualificationStage.blockIds) {
    console.log("[UNIFIED-MESSAGES] No EXPERIENCE_QUALIFICATION stage found, returning all messages");
    return messages;
  }

  // Find the first bot message that belongs to EXPERIENCE_QUALIFICATION stage
  let experienceQualificationStartIndex = -1;
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Look for bot messages that might be from EXPERIENCE_QUALIFICATION stage
    if (message.type === "bot") {
      // Check if this message's metadata indicates it's from EXPERIENCE_QUALIFICATION
      if (message.metadata?.blockId && 
          experienceQualificationStage.blockIds.includes(message.metadata.blockId)) {
        experienceQualificationStartIndex = i;
        console.log(`[UNIFIED-MESSAGES] Found EXPERIENCE_QUALIFICATION start at message index ${i}, blockId: ${message.metadata.blockId}`);
        break;
      }
      
      // Also check if the message content matches the EXPERIENCE_QUALIFICATION block message
      // This is a fallback for messages that might not have metadata
      const experienceBlocks = experienceQualificationStage.blockIds.map((blockId: string) => 
        funnelFlow.blocks?.[blockId]
      ).filter(Boolean);
      
      for (const block of experienceBlocks) {
        if (block.message && message.text && block.message.substring(0, 50) && message.text.includes(block.message.substring(0, 50))) {
          experienceQualificationStartIndex = i;
          console.log(`[UNIFIED-MESSAGES] Found EXPERIENCE_QUALIFICATION start at message index ${i} by content match`);
          break;
        }
      }
      
      if (experienceQualificationStartIndex !== -1) break;
    }
  }

  if (experienceQualificationStartIndex === -1) {
    console.log("[UNIFIED-MESSAGES] No EXPERIENCE_QUALIFICATION messages found, returning all messages");
    return messages;
  }

  const filteredMessages = messages.slice(experienceQualificationStartIndex);
  console.log(`[UNIFIED-MESSAGES] Filtered messages: ${messages.length} -> ${filteredMessages.length} (starting from EXPERIENCE_QUALIFICATION)`);
  
  return filteredMessages;
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