/**
 * Core DM Monitoring Utilities
 * 
 * Provides complete DM monitoring functionality including:
 * - DM sending
 * - Message processing
 * - Re-prompt system
 * - Phase-specific logic
 * - Funnel navigation
 */

import { and, eq } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, messages, funnelInteractions, resources, experiences } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import { updateConversationBlock, addMessage, detectConversationPhase, sendTransitionMessage as sendEnhancedTransitionMessage } from "../actions/simplified-conversation-actions";
import { getWhopApiClient } from "../whop-api-client";
import type { FunnelFlow, FunnelBlock, FunnelBlockOption } from "../types/funnel";

/**
 * Re-prompt configuration for both phases
 */
export const RE_PROMPT_CONFIG = {
  PHASE1: {
    10: "Hey, what's your niche? Reply 1 for E-commerce, etc.",
    60: "Missed you! Reply with a number for free value.",
    720: "Still interested? Reply for your free resource!"
  },
  PHASE2: {
    15: "Reply 'done' when you've checked the value!",
    60: "All set? Say 'done' for the next step!",
    720: "Still with us? Reply 'done' for private chat!"
  }
} as const;

/**
 * Error message templates for progressive error handling
 */
export const ERROR_MESSAGES = {
  FIRST_ATTEMPT: "Please choose from the provided options above.",
  SECOND_ATTEMPT: "I'll inform the Whop owner about your request. Please wait for assistance.",
  THIRD_ATTEMPT: "I'm unable to help you further. Please contact the Whop owner directly.",
} as const;

/**
 * Send a DM message to a user
 */
export async function sendDirectMessage(
  conversationId: string,
  message: string,
  experienceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get conversation to get whopUserId
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const whopUserId = conversation.whopUserId;
    if (!whopUserId) {
      return { success: false, error: "Whop user ID not found" };
    }

    // Send DM to user
    await whopSdk.messages.sendDirectMessageToUser({
      toUserIdOrUsername: whopUserId,
      message: message,
    });

    // Record bot message in database
    await addMessage(conversationId, "bot", message);

    console.log(`[DM Core] Sent DM to user ${whopUserId}: ${message}`);
    return { success: true };

  } catch (error) {
    console.error(`[DM Core] Error sending DM for conversation ${conversationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Look up resource by name and experience ID
 * Returns the resource link if found, null otherwise
 */
export async function lookupResourceLink(resourceName: string, experienceId: string): Promise<string | null> {
  try {
    console.log(`[Resource Lookup] Looking up resource: "${resourceName}" for experience: ${experienceId}`);
    
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.experienceId, experienceId),
        eq(resources.name, resourceName)
      ),
    });

    if (resource?.link) {
      console.log(`[Resource Lookup] Found resource link: ${resource.link}`);
      return resource.link;
    } else {
      console.log(`[Resource Lookup] Resource not found or has no link: "${resourceName}"`);
      return null;
    }
  } catch (error) {
    console.error(`[Resource Lookup] Error looking up resource "${resourceName}":`, error);
    return null;
  }
}

/**
 * Replace [LINK] placeholders with actual resource links
 */
async function resolveLinkPlaceholders(message: string, block: FunnelBlock, experienceId: string): Promise<string> {
  // Check if message contains [LINK] placeholder
  if (!message.includes('[LINK]')) {
    return message;
  }

  // Check if block has resourceName
  if (!block.resourceName) {
    console.log(`[Link Resolution] Block has no resourceName, keeping [LINK] placeholder`);
    return message;
  }

  // Look up the resource link
  const resourceLink = await lookupResourceLink(block.resourceName, experienceId);
  
  if (resourceLink) {
    // Replace all [LINK] placeholders with the actual link
    const resolvedMessage = message.replace(/\[LINK\]/g, resourceLink);
    console.log(`[Link Resolution] Replaced [LINK] with: ${resourceLink}`);
    return resolvedMessage;
  } else {
    console.log(`[Link Resolution] Resource not found, keeping [LINK] placeholder`);
    return message;
  }
}

/**
 * Send next block message with options and dynamic link resolution
 */
export async function sendNextBlockMessage(
  conversationId: string,
  blockId: string,
  funnelFlow: FunnelFlow,
  experienceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const block = funnelFlow.blocks[blockId];
    if (!block) {
      return { success: false, error: `Block ${blockId} not found` };
    }

    // Format message with options
    let message = block.message || "Please select an option:";
    if (block.options && block.options.length > 0) {
      message += "\n\nAnswer with number/keyword\n";
      block.options.forEach((option, index) => {
        message += `${index + 1}. ${option.text}\n`;
      });
    }

    // Resolve [LINK] placeholders with actual resource links
    const resolvedMessage = await resolveLinkPlaceholders(message, block, experienceId);

    return await sendDirectMessage(conversationId, resolvedMessage, experienceId);

  } catch (error) {
    console.error(`[DM Core] Error sending next block message:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send re-prompt message based on phase and timing
 */
export async function sendRePromptMessage(
  conversationId: string,
  phase: 'PHASE1' | 'PHASE2',
  timing: number,
  experienceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rePromptMessage = RE_PROMPT_CONFIG[phase][timing as keyof typeof RE_PROMPT_CONFIG[typeof phase]];
    if (!rePromptMessage) {
      return { success: false, error: `No re-prompt message for phase ${phase} timing ${timing}` };
    }

    return await sendDirectMessage(conversationId, rePromptMessage, experienceId);

  } catch (error) {
    console.error(`[DM Core] Error sending re-prompt message:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send error message with progressive handling
 */
export async function sendErrorMessage(
  conversationId: string,
  attemptCount: number,
  experienceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let errorMessage: string;
    if (attemptCount === 1) {
      errorMessage = ERROR_MESSAGES.FIRST_ATTEMPT;
    } else if (attemptCount === 2) {
      errorMessage = ERROR_MESSAGES.SECOND_ATTEMPT;
    } else {
      errorMessage = ERROR_MESSAGES.THIRD_ATTEMPT;
    }

    return await sendDirectMessage(conversationId, errorMessage, experienceId);

  } catch (error) {
    console.error(`[DM Core] Error sending error message:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Process user response and navigate funnel
 */
export async function processUserResponse(
  conversationId: string,
  messageContent: string,
  funnelFlow: FunnelFlow,
  experienceId: string
): Promise<{ success: boolean; nextBlockId?: string; error?: string }> {
  try {
    // Get current conversation
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const currentBlockId = conversation.currentBlockId;
    if (!currentBlockId) {
      return { success: false, error: "No current block found" };
    }

    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) {
      return { success: false, error: "Current block not found" };
    }

    // Add user message to database
    await addMessage(conversationId, "user", messageContent);

    // Check phase-specific completion logic
    const currentPhase = detectConversationPhase(currentBlockId, funnelFlow);
    
    // Phase 1 completion: User responds to WELCOME → Send VALUE_DELIVERY message
    if (currentPhase === 'PHASE1') {
      return await handlePhase1Completion(conversationId, funnelFlow, experienceId);
    }
    
    // Phase 2 completion: User responds to VALUE_DELIVERY → Send TRANSITION message
    if (currentPhase === 'PHASE2') {
      return await handlePhase2Completion(conversationId, funnelFlow, experienceId);
    }

    // Find matching option using existing validation logic
    const validationResult = validateUserResponse(messageContent, currentBlock);
    if (!validationResult.isValid) {
      // Handle invalid response with progressive error handling
      return await handleInvalidResponse(conversationId, experienceId);
    }

    const selectedOption = validationResult.selectedOption;
    if (!selectedOption) {
      return { success: false, error: "No valid option selected" };
    }

    const nextBlockId = selectedOption.nextBlockId;
    if (!nextBlockId) {
      return { success: false, error: "No next block ID found" };
    }

    // Record funnel interaction
    await db.insert(funnelInteractions).values({
      conversationId: conversationId,
      blockId: currentBlockId,
      optionText: selectedOption.text,
      nextBlockId: nextBlockId,
    });

    // Update conversation block with phase detection
    const updatedUserPath = [...(conversation.userPath || []), nextBlockId].filter(Boolean);
    await updateConversationBlock(conversationId, nextBlockId, updatedUserPath, experienceId);

    // Check if this is a TRANSITION block
    const nextBlock = funnelFlow.blocks[nextBlockId];
    if (isTransitionBlock(nextBlock, funnelFlow)) {
      // Send transition message with app link resolution and complete conversation
      await sendEnhancedTransitionMessage(
        conversation.whopUserId,
        nextBlock.message,
        experienceId
      );
      return { success: true, nextBlockId };
    }

    // Send next block message
    const result = await sendNextBlockMessage(conversationId, nextBlockId, funnelFlow, experienceId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, nextBlockId };

  } catch (error) {
    console.error(`[DM Core] Error processing user response:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Validate user response against current block options (from existing monitoring)
 */
function validateUserResponse(
  userMessage: string, 
  currentBlock: any
): {
  isValid: boolean;
  selectedOption?: any;
  errorMessage?: string;
} {
  try {
    // Normalize user input
    const normalizedInput = normalizeInput(userMessage);

    // Check for exact text matches (case-insensitive)
    for (const option of currentBlock.options || []) {
      if (normalizeInput(option.text) === normalizedInput) {
        return {
          isValid: true,
          selectedOption: option,
        };
      }
    }

    // Check for number selection (1, 2, 3...)
    const numberMatch = normalizedInput.match(/^(\d+)$/);
    if (numberMatch) {
      const optionIndex = parseInt(numberMatch[1]) - 1;
      if (optionIndex >= 0 && optionIndex < (currentBlock.options || []).length) {
        return {
          isValid: true,
          selectedOption: currentBlock.options[optionIndex],
        };
      }
    }

    // Invalid response
    return {
      isValid: false,
      errorMessage: `Please select one of the following options:\n${(currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. ${opt.text}`).join('\n')}`,
    };

  } catch (error) {
    console.error(`[DM Core] Error validating user response:`, error);
    return {
      isValid: false,
      errorMessage: "Invalid response. Please try again.",
    };
  }
}

/**
 * Normalize input for comparison (from existing monitoring)
 */
function normalizeInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, ''); // Remove special characters
}


/**
 * Handle invalid user response
 */
async function handleInvalidResponse(
  conversationId: string,
  experienceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get conversation to check attempt count
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Count recent invalid attempts (simplified - in production, you'd track this properly)
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: (messages: any, { desc }: any) => [desc(messages.createdAt)],
      limit: 10,
    });

    const invalidAttempts = recentMessages.filter((msg: any) => 
      msg.type === 'bot' && 
      (msg.content.includes('Please choose') || msg.content.includes('I\'ll inform'))
    ).length;

    // Send progressive error message
    return await sendErrorMessage(conversationId, invalidAttempts + 1, experienceId);

  } catch (error) {
    console.error(`[DM Core] Error handling invalid response:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Handle Phase 1 completion (user responded to WELCOME)
 */
async function handlePhase1Completion(
  conversationId: string,
  funnelFlow: FunnelFlow,
  experienceId: string
): Promise<{ success: boolean; nextBlockId?: string; error?: string }> {
  try {
    // Find VALUE_DELIVERY block
    const valueDeliveryStage = funnelFlow.stages.find(stage => stage.name === 'VALUE_DELIVERY');
    if (!valueDeliveryStage || valueDeliveryStage.blockIds.length === 0) {
      return { success: false, error: "No VALUE_DELIVERY blocks found" };
    }

    const valueDeliveryBlockId = valueDeliveryStage.blockIds[0];
    const valueDeliveryBlock = funnelFlow.blocks[valueDeliveryBlockId];

    if (!valueDeliveryBlock) {
      return { success: false, error: "VALUE_DELIVERY block not found" };
    }

    // Update conversation to VALUE_DELIVERY stage
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const updatedUserPath = [...(conversation.userPath || []), valueDeliveryBlockId].filter(Boolean);
    await updateConversationBlock(conversationId, valueDeliveryBlockId, updatedUserPath, experienceId);

    // Set Phase 2 start time
    await db.update(conversations)
      .set({
        phase2StartTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    // Send VALUE_DELIVERY message with resource link resolution
    const result = await sendNextBlockMessage(conversationId, valueDeliveryBlockId, funnelFlow, experienceId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    console.log(`[DM Core] Sent VALUE_DELIVERY message and completed Phase 1 for conversation ${conversationId}`);
    return { success: true, nextBlockId: valueDeliveryBlockId };

  } catch (error) {
    console.error(`[DM Core] Error handling Phase 1 completion:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Handle Phase 2 completion (user responded to VALUE_DELIVERY)
 */
async function handlePhase2Completion(
  conversationId: string,
  funnelFlow: FunnelFlow,
  experienceId: string
): Promise<{ success: boolean; nextBlockId?: string; error?: string }> {
  try {
    // Find TRANSITION block
    const transitionStage = funnelFlow.stages.find(stage => stage.name === 'TRANSITION');
    if (!transitionStage || transitionStage.blockIds.length === 0) {
      return { success: false, error: "No TRANSITION blocks found" };
    }

    const transitionBlockId = transitionStage.blockIds[0];
    const transitionBlock = funnelFlow.blocks[transitionBlockId];

    if (!transitionBlock) {
      return { success: false, error: "TRANSITION block not found" };
    }

    // Update conversation to TRANSITION stage
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const updatedUserPath = [...(conversation.userPath || []), transitionBlockId].filter(Boolean);
    await updateConversationBlock(conversationId, transitionBlockId, updatedUserPath, experienceId);

    // Send transition message with app link resolution
    await sendEnhancedTransitionMessage(
      conversation.whopUserId,
      transitionBlock.message,
      conversation.experienceId
    );

    return { success: true, nextBlockId: transitionBlockId };

  } catch (error) {
    console.error(`[DM Core] Error handling Phase 2 completion:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}


/**
 * Check if a block is a transition block
 */
function isTransitionBlock(block: FunnelBlock, funnelFlow: FunnelFlow): boolean {
  if (!block || !funnelFlow) return false;
  
  const transitionStage = funnelFlow.stages.find(stage => stage.name === 'TRANSITION');
  return transitionStage ? transitionStage.blockIds.includes(block.id) : false;
}

/**
 * Get conversation age in minutes
 */
export function getConversationAge(conversation: any, phase: 'PHASE1' | 'PHASE2'): number {
  const startTime = phase === 'PHASE1' ? conversation.createdAt : conversation.phase2StartTime;
  if (!startTime) return 0;
  
  const now = new Date();
  const start = new Date(startTime);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Check if re-prompt should be sent
 */
export function shouldSendRePrompt(conversation: any, phase: 'PHASE1' | 'PHASE2'): { shouldSend: boolean; timing?: number } {
  const age = getConversationAge(conversation, phase);
  
  if (phase === 'PHASE1') {
    // Use time windows instead of exact equality
    if (age >= 10 && age < 11) return { shouldSend: true, timing: 10 };
    if (age >= 60 && age < 61) return { shouldSend: true, timing: 60 };
    if (age >= 720 && age < 721) return { shouldSend: true, timing: 720 };
  } else if (phase === 'PHASE2') {
    // Use time windows instead of exact equality
    if (age >= 15 && age < 16) return { shouldSend: true, timing: 15 };
    if (age >= 60 && age < 61) return { shouldSend: true, timing: 60 };
    if (age >= 720 && age < 721) return { shouldSend: true, timing: 720 };
  }
  
  return { shouldSend: false };
}
