import { db } from "@/lib/supabase/db-server";
import { conversations, messages } from "@/lib/supabase/schema";
import { eq, and, lt, desc } from "drizzle-orm";

/**
 * Close conversations that have been inactive for 2 days
 * A conversation is considered inactive if the last message was sent 2+ days ago
 */
export async function closeInactiveConversations(): Promise<{
  success: boolean;
  closed: number;
  errors: any[];
}> {
  try {
    console.log("[ConversationCleanup] Starting to close inactive conversations...");
    
    // Calculate the cutoff date (2 days ago)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Find all active conversations
    const activeConversations = await db
      .select({
        id: conversations.id,
        experienceId: conversations.experienceId,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.status, "active"));

    // Filter conversations that have no messages in the last 2 days
    const inactiveConversations = [];
    for (const conversation of activeConversations) {
      const lastMessage = await db
        .select({
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (lastMessage.length === 0 || new Date(lastMessage[0].createdAt) < twoDaysAgo) {
        inactiveConversations.push(conversation);
      }
    }

    console.log(`[ConversationCleanup] Found ${inactiveConversations.length} inactive conversations to close`);

    const errors: any[] = [];
    let closed = 0;

    for (const conversation of inactiveConversations) {
      try {
        await db
          .update(conversations)
          .set({
            status: "closed",
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversation.id));

        console.log(`[ConversationCleanup] Closed conversation ${conversation.id}`);
        closed++;
      } catch (error) {
        console.error(`[ConversationCleanup] Error closing conversation ${conversation.id}:`, error);
        errors.push({
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`[ConversationCleanup] Closed ${closed} conversations, ${errors.length} errors`);
    
    return {
      success: true,
      closed,
      errors,
    };
  } catch (error) {
    console.error("[ConversationCleanup] Error in closeInactiveConversations:", error);
    return {
      success: false,
      closed: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Delete conversations that have been closed for 2 days
 * This permanently removes the conversation and all its messages
 */
export async function deleteOldClosedConversations(): Promise<{
  success: boolean;
  deleted: number;
  errors: any[];
}> {
  try {
    console.log("[ConversationCleanup] Starting to delete old closed conversations...");
    
    // Calculate the cutoff date (2 days ago)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Find conversations that are closed and were updated 2+ days ago
    const oldClosedConversations = await db
      .select({
        id: conversations.id,
        experienceId: conversations.experienceId,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.status, "closed"),
          lt(conversations.updatedAt, twoDaysAgo)
        )
      );

    console.log(`[ConversationCleanup] Found ${oldClosedConversations.length} old closed conversations to delete`);

    const errors: any[] = [];
    let deleted = 0;

    for (const conversation of oldClosedConversations) {
      try {
        // Delete all messages first (foreign key constraint)
        await db
          .delete(messages)
          .where(eq(messages.conversationId, conversation.id));

        // Delete the conversation
        await db
          .delete(conversations)
          .where(eq(conversations.id, conversation.id));

        console.log(`[ConversationCleanup] Deleted conversation ${conversation.id} and all its messages`);
        deleted++;
      } catch (error) {
        console.error(`[ConversationCleanup] Error deleting conversation ${conversation.id}:`, error);
        errors.push({
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`[ConversationCleanup] Deleted ${deleted} conversations, ${errors.length} errors`);
    
    return {
      success: true,
      deleted,
      errors,
    };
  } catch (error) {
    console.error("[ConversationCleanup] Error in deleteOldClosedConversations:", error);
    return {
      success: false,
      deleted: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
