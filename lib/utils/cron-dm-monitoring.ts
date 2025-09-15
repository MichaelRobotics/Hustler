/**
 * Cron-Based DM Monitoring System
 * 
 * Replaces the old serverless DM monitoring with cron-based processing.
 * This system handles all DM interactions through scheduled cron jobs,
 * making it fully compatible with Vercel's serverless architecture.
 */

import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/supabase/db-server";
import { conversations, funnels, experiences } from "@/lib/supabase/schema";
import { whopSdk } from "@/lib/whop-sdk";
import { processUserResponse, sendNextBlockMessage, sendRePromptMessage, sendTransitionMessage } from "@/lib/utils/dm-monitoring-core";
import { detectConversationPhase } from "@/lib/actions/simplified-conversation-actions";
import { rateLimiter } from "@/lib/middleware/rate-limiter";
import { tenantMetricsCollector } from "@/lib/monitoring/tenant-metrics";
import { cronMemoryManager, errorRecoveryManager } from "@/lib/utils/cron-polling-utils";
import type { FunnelFlow } from "@/lib/types/funnel";

/**
 * Configuration for different polling phases
 */
const POLLING_CONFIG = {
  PHASE1_CRITICAL: { minMinutes: 0, maxMinutes: 2, interval: 1 },
  PHASE1_HIGH: { minMinutes: 2, maxMinutes: 10, interval: 2 },
  PHASE1_LOW: { minMinutes: 10, maxMinutes: 30, interval: 5 },
  PHASE1_EXTENDED: { minMinutes: 30, maxMinutes: 1440, interval: 30 },
  PHASE2_CRITICAL: { minMinutes: 0, maxMinutes: 5, interval: 1 },
  PHASE2_HIGH: { minMinutes: 5, maxMinutes: 30, interval: 2 },
  PHASE2_LOW: { minMinutes: 30, maxMinutes: 60, interval: 5 },
  PHASE2_EXTENDED: { minMinutes: 60, maxMinutes: 1440, interval: 30 },
} as const;

/**
 * Rate limiting for DM operations
 */
const DM_RATE_LIMITS = {
  DM_POLLING: { limit: 15, windowMs: 10000 },
  MESSAGE_SENDING: { limit: 10, windowMs: 10000 },
} as const;

/**
 * Process conversations for a specific phase and time window
 */
export async function processConversationsForPhase(
  phase: 'PHASE1' | 'PHASE2',
  timeWindow: keyof typeof POLLING_CONFIG,
  experienceId?: string
): Promise<{
  success: boolean;
  processed: number;
  total: number;
  results: any[];
  errors: any[];
}> {
  const config = POLLING_CONFIG[timeWindow];
  const startTime = Date.now();
  
  try {
    console.log(`[Cron DM] Processing ${phase} conversations in ${timeWindow} window (${config.minMinutes}-${config.maxMinutes} minutes)`);

    // Calculate time boundaries
    const now = new Date();
    const minTime = new Date(now.getTime() - config.maxMinutes * 60 * 1000);
    const maxTime = new Date(now.getTime() - config.minMinutes * 60 * 1000);

    // Build query conditions
    const conditions = [
      eq(conversations.status, "active"),
      gte(conversations.createdAt, minTime),
      lt(conversations.createdAt, maxTime)
    ];

    // Add experience filter if provided
    if (experienceId) {
      conditions.push(eq(conversations.experienceId, experienceId));
    }

    // Find conversations in the time window
    const activeConversations = await db.query.conversations.findMany({
      where: and(...conditions),
      with: {
        funnel: true,
        experience: true,
      },
    });

    console.log(`[Cron DM] Found ${activeConversations.length} conversations in time window`);

    if (activeConversations.length === 0) {
      return {
        success: true,
        processed: 0,
        total: 0,
        results: [],
        errors: []
      };
    }

    let processedCount = 0;
    const results = [];
    const errors = [];
    const tenantStats = new Map<string, { processed: number; errors: number }>();

    // Process each conversation
    for (const conversation of activeConversations) {
      try {
        const tenantId = conversation.experienceId;
        
        // Initialize tenant stats
        if (!tenantStats.has(tenantId)) {
          tenantStats.set(tenantId, { processed: 0, errors: 0 });
        }

        // Check memory limits
        if (!cronMemoryManager.isWithinMemoryLimits(tenantId)) {
          console.warn(`[Cron DM] Memory limit exceeded for tenant ${tenantId}, skipping`);
          continue;
        }

        // Check rate limits
        if (!rateLimiter.isAllowed(tenantId, 'dm_polling', DM_RATE_LIMITS.DM_POLLING.limit, DM_RATE_LIMITS.DM_POLLING.windowMs)) {
          console.log(`[Cron DM] Rate limited for tenant ${tenantId}, skipping`);
          continue;
        }

        const funnelFlow = conversation.funnel?.flow as FunnelFlow;
        if (!funnelFlow) {
          console.error(`[Cron DM] No funnel flow for conversation ${conversation.id}`);
          continue;
        }

        // Verify this is the correct phase
        const currentPhase = detectConversationPhase(conversation.currentBlockId, funnelFlow);
        if (currentPhase !== phase) {
          console.log(`[Cron DM] Skipping conversation ${conversation.id} - not in ${phase} (${currentPhase})`);
          continue;
        }

        // Process the conversation
        const result = await processConversationWithDM(conversation, funnelFlow, phase, tenantId);
        
        results.push({
          conversationId: conversation.id,
          tenantId: tenantId,
          phase: currentPhase,
          result,
        });

        processedCount++;
        const stats = tenantStats.get(tenantId);
        if (stats) {
          stats.processed++;
        }

      } catch (error) {
        console.error(`[Cron DM] Error processing conversation ${conversation.id}:`, error);
        const tenantId = conversation.experienceId;
        const stats = tenantStats.get(tenantId);
        if (stats) {
          stats.errors++;
        }
        
        errors.push({
          conversationId: conversation.id,
          tenantId: tenantId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update tenant metrics
    for (const [tenantId, stats] of tenantStats.entries()) {
      tenantMetricsCollector.updateActiveConversations(tenantId, tenantId, stats.processed);
      if (stats.errors > 0) {
        tenantMetricsCollector.recordError(tenantId, tenantId, new Error(`${phase}-${timeWindow}: ${stats.errors} errors`));
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`[Cron DM] Processed ${processedCount} ${phase} conversations in ${responseTime}ms`);

    return {
      success: true,
      processed: processedCount,
      total: activeConversations.length,
      results,
      errors
    };

  } catch (error) {
    console.error(`[Cron DM] Error processing ${phase} conversations:`, error);
    return {
      success: false,
      processed: 0,
      total: 0,
      results: [],
      errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }]
    };
  }
}

/**
 * Process a single conversation with DM monitoring
 */
async function processConversationWithDM(
  conversation: any,
  funnelFlow: FunnelFlow,
  phase: 'PHASE1' | 'PHASE2',
  tenantId: string
): Promise<string> {
  try {
    // Check if re-prompt should be sent
    const rePromptCheck = shouldSendRePrompt(conversation, phase);
    if (rePromptCheck.shouldSend) {
      console.log(`[Cron DM] Sending re-prompt for conversation ${conversation.id} at ${rePromptCheck.timing} minutes`);
      
      // Check rate limit for message sending
      if (!rateLimiter.isAllowed(tenantId, 'message_sending', DM_RATE_LIMITS.MESSAGE_SENDING.limit, DM_RATE_LIMITS.MESSAGE_SENDING.windowMs)) {
        return "Rate limited for message sending - skipping re-prompt";
      }
      
      // Use error recovery for re-prompt sending
      const rePromptResult = await errorRecoveryManager.executeWithRetry(
        tenantId,
        () => sendRePromptMessage(conversation.id, phase, rePromptCheck.timing!, conversation.experienceId),
        'send_re_prompt'
      );
      
      if (rePromptResult.success) {
        return `Sent re-prompt message at ${rePromptCheck.timing} minutes (${rePromptResult.retryCount} retries)`;
      } else {
        return `Failed to send re-prompt: ${rePromptResult.error} (${rePromptResult.retryCount} retries)`;
      }
    }

    // Use error recovery for DM polling
    const dmPollingResult = await errorRecoveryManager.executeWithRetry(
      tenantId,
      async () => {
        // Get recent messages from Whop DM
        const dmConversations = await whopSdk.messages.listDirectMessageConversations({
          limit: 10,
          status: "accepted",
        });

        // Find conversation with this user
        const userDM = dmConversations.find((dm: any) => 
          dm.feedMembers?.some((member: any) => member.id === conversation.whopUserId)
        );

        if (!userDM) {
          throw new Error("No DM conversation found");
        }

        // Get messages from the DM feed
        const dmMessages = await whopSdk.messages.listMessagesFromChat({
          chatExperienceId: conversation.experience.whopExperienceId,
        });

        return { userDM, dmMessages };
      },
      'poll_dm_messages'
    );

    if (!dmPollingResult.success) {
      return `DM polling failed: ${dmPollingResult.error} (${dmPollingResult.retryCount} retries)`;
    }

    const { userDM, dmMessages } = dmPollingResult.result!;

    // Check for new user messages since last check
    const lastBotMessage = conversation.messages
      ?.filter((msg: any) => msg.type === 'bot')
      ?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const newUserMessages = dmMessages?.posts
      ?.filter((msg: any) => 
        msg.user?.id === conversation.whopUserId &&
        (!lastBotMessage || new Date(msg.createdAt) > new Date(lastBotMessage.createdAt))
      )
      ?.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (newUserMessages && newUserMessages.length > 0) {
      // Process the latest user message
      const latestMessage = newUserMessages[newUserMessages.length - 1];
      const messageContent = (latestMessage as any)?.content || 'No content';
      
      console.log(`[Cron DM] Processing user message: "${messageContent}"`);
      
      // Use error recovery for user response processing
      const processResult = await errorRecoveryManager.executeWithRetry(
        tenantId,
        () => processUserResponse(conversation.id, messageContent, funnelFlow, conversation.experienceId),
        'process_user_response'
      );
      
      if (processResult.success) {
        return `Processed user message: "${messageContent}" -> Next block: ${processResult.result?.nextBlockId || 'Completed'} (${processResult.retryCount} retries)`;
      } else {
        return `Failed to process user message: ${processResult.error} (${processResult.retryCount} retries)`;
      }
    }

    return "No new user messages found";

  } catch (error) {
    console.error(`[Cron DM] Error processing conversation ${conversation.id}:`, error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Check if re-prompt should be sent based on conversation age and phase
 */
function shouldSendRePrompt(conversation: any, phase: 'PHASE1' | 'PHASE2'): {
  shouldSend: boolean;
  timing?: number;
} {
  const now = new Date();
  const conversationAge = now.getTime() - new Date(conversation.createdAt).getTime();
  const ageMinutes = Math.floor(conversationAge / (1000 * 60));

  // Phase 1 re-prompt schedule
  if (phase === 'PHASE1') {
    if (ageMinutes >= 2 && ageMinutes < 3) return { shouldSend: true, timing: 2 };
    if (ageMinutes >= 5 && ageMinutes < 6) return { shouldSend: true, timing: 5 };
    if (ageMinutes >= 10 && ageMinutes < 11) return { shouldSend: true, timing: 10 };
  }

  // Phase 2 re-prompt schedule
  if (phase === 'PHASE2') {
    if (ageMinutes >= 5 && ageMinutes < 6) return { shouldSend: true, timing: 5 };
    if (ageMinutes >= 15 && ageMinutes < 16) return { shouldSend: true, timing: 15 };
    if (ageMinutes >= 30 && ageMinutes < 31) return { shouldSend: true, timing: 30 };
  }

  return { shouldSend: false };
}

/**
 * Handle Phase 1 cleanup (24 hours)
 */
export async function handlePhase1Cleanup(experienceId?: string): Promise<{
  success: boolean;
  processed: number;
  results: any[];
}> {
  try {
    console.log(`[Cron DM] Starting Phase 1 cleanup`);

    // Find Phase 1 conversations older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const conditions = [
      eq(conversations.status, "active"),
      lt(conversations.createdAt, cutoffTime)
    ];

    if (experienceId) {
      conditions.push(eq(conversations.experienceId, experienceId));
    }

    const oldConversations = await db.query.conversations.findMany({
      where: and(...conditions),
      with: {
        funnel: true,
        experience: true,
      },
    });

    const results = [];
    let processed = 0;

    for (const conversation of oldConversations) {
      try {
        const funnelFlow = conversation.funnel?.flow as FunnelFlow;
        if (!funnelFlow) continue;

        // Send random VALUE_DELIVERY message and transition to Phase 2
        const result = await sendNextBlockMessage(
          conversation.id,
          funnelFlow.startBlockId, // This should be the VALUE_DELIVERY block
          funnelFlow,
          conversation.experienceId
        );

        if (result.success) {
          // Update conversation to Phase 2
          await db.update(conversations)
            .set({
              currentBlockId: funnelFlow.startBlockId,
              phase2StartTime: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation.id));

          results.push({
            conversationId: conversation.id,
            action: 'transitioned_to_phase2',
            result: result.message
          });
          processed++;
        }
      } catch (error) {
        console.error(`[Cron DM] Error in Phase 1 cleanup for conversation ${conversation.id}:`, error);
      }
    }

    console.log(`[Cron DM] Phase 1 cleanup completed: ${processed} conversations processed`);

    return {
      success: true,
      processed,
      results
    };

  } catch (error) {
    console.error(`[Cron DM] Error in Phase 1 cleanup:`, error);
    return {
      success: false,
      processed: 0,
      results: []
    };
  }
}

/**
 * Handle Phase 2 cleanup (24 hours)
 */
export async function handlePhase2Cleanup(experienceId?: string): Promise<{
  success: boolean;
  processed: number;
  results: any[];
}> {
  try {
    console.log(`[Cron DM] Starting Phase 2 cleanup`);

    // Find Phase 2 conversations older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const conditions = [
      eq(conversations.status, "active"),
      lt(conversations.phase2StartTime, cutoffTime)
    ];

    if (experienceId) {
      conditions.push(eq(conversations.experienceId, experienceId));
    }

    const oldConversations = await db.query.conversations.findMany({
      where: and(...conditions),
      with: {
        funnel: true,
        experience: true,
      },
    });

    const results = [];
    let processed = 0;

    for (const conversation of oldConversations) {
      try {
        const funnelFlow = conversation.funnel?.flow as FunnelFlow;
        if (!funnelFlow) continue;

        // Send TRANSITION message with personalized chat link
        const transitionBlock = Object.values(funnelFlow.blocks).find(block => 
          block.type === 'TRANSITION'
        );

        if (transitionBlock) {
          const result = await sendTransitionMessage(
            conversation.id,
            transitionBlock,
            conversation.experienceId
          );

          if (result.success) {
            // Complete the conversation
            await db.update(conversations)
              .set({
                status: 'completed',
                updatedAt: new Date(),
              })
              .where(eq(conversations.id, conversation.id));

            results.push({
              conversationId: conversation.id,
              action: 'completed_conversation',
              result: result.message
            });
            processed++;
          }
        }
      } catch (error) {
        console.error(`[Cron DM] Error in Phase 2 cleanup for conversation ${conversation.id}:`, error);
      }
    }

    console.log(`[Cron DM] Phase 2 cleanup completed: ${processed} conversations processed`);

    return {
      success: true,
      processed,
      results
    };

  } catch (error) {
    console.error(`[Cron DM] Error in Phase 2 cleanup:`, error);
    return {
      success: false,
      processed: 0,
      results: []
    };
  }
}
