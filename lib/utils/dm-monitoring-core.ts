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
import { conversations, messages, funnelInteractions, resources, experiences, users } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import { updateConversationBlock, addMessage, detectConversationPhase, sendTransitionMessage as sendEnhancedTransitionMessage } from "../actions/simplified-conversation-actions";
import { getWhopApiClient } from "../whop-api-client";
import type { FunnelFlow, FunnelBlock, FunnelBlockOption } from "../types/funnel";

/**
 * Re-prompt configuration for both phases
 * Note: PHASE1 messages will be dynamically generated with real options
 */
export const RE_PROMPT_CONFIG = {
  PHASE1: {
    10: "Hey! What's your niche?",
    60: "Missed you! Reply with a number for free value.",
    720: "Still interested? Reply for your free resource!"
  },
  PHASE2: {
    15: "🚨 [USER], your session expire in 24 hours!\n\naccess and claim even 75% OFF gift cards\n\nreply \"UNLOCK\" for access",
    60: "🚨 [USER], your session expire in 24 hours!\n\naccess and claim even 75% OFF gift cards\n\nreply \"UNLOCK\" for access",
    720: "🚨 [USER], your session expire in 24 hours!\n\naccess and claim even 75% OFF gift cards\n\nreply \"UNLOCK\" for access"
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
 * Look up admin user (WHOP_OWNER) by experience ID
 * Returns the admin user's name if found, null otherwise
 */
async function lookupAdminUser(experienceId: string): Promise<string | null> {
  try {
    console.log(`[Admin Lookup] Looking up admin user for experience: ${experienceId}`);
    
    const adminUser = await db.query.users.findFirst({
      where: and(
        eq(users.experienceId, experienceId),
        eq(users.accessLevel, "admin")
      ),
    });

    if (adminUser?.name) {
      // Return first word of admin name (same logic as [USER] placeholder)
      const firstName = adminUser.name.split(' ')[0];
      console.log(`[Admin Lookup] Found admin user: ${adminUser.name} -> firstName: ${firstName}`);
      return firstName;
    } else {
      console.log(`[Admin Lookup] No admin user found for experience: ${experienceId}`);
      return null;
    }
  } catch (error) {
    console.error(`[Admin Lookup] Error looking up admin user for experience ${experienceId}:`, error);
    return null;
  }
}

/**
 * Look up current user by conversation ID
 * Returns the user's name if found, null otherwise
 */
export async function lookupCurrentUser(conversationId: string): Promise<string | null> {
  try {
    console.log(`[User Lookup] Looking up current user for conversation: ${conversationId}`);
    
    // Get conversation to find whopUserId
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation?.whopUserId) {
      console.log(`[User Lookup] No conversation or whopUserId found for conversation: ${conversationId}`);
      return null;
    }

    // Find user by whopUserId and experienceId
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.whopUserId, conversation.whopUserId),
        eq(users.experienceId, conversation.experienceId)
      ),
    });

    if (user?.name) {
      // Return first word of user name (same logic as in user-join-actions.ts)
      const firstName = user.name.split(' ')[0];
      console.log(`[User Lookup] Found user: ${user.name} -> firstName: ${firstName}`);
      return firstName;
    } else {
      console.log(`[User Lookup] No user found for whopUserId: ${conversation.whopUserId}`);
      return null;
    }
  } catch (error) {
    console.error(`[User Lookup] Error looking up current user for conversation ${conversationId}:`, error);
    return null;
  }
}

/**
 * Replace [LINK], [WHOP_OWNER], and [USER] placeholders with actual values
 */
async function resolveLinkPlaceholders(message: string, block: FunnelBlock, experienceId: string, conversationId?: string): Promise<string> {
  let resolvedMessage = message;

  // Resolve [LINK] placeholder
  if (resolvedMessage.includes('[LINK]')) {
    if (block.resourceName) {
      const resourceLink = await lookupResourceLink(block.resourceName, experienceId);
      if (resourceLink) {
        resolvedMessage = resolvedMessage.replace(/\[LINK\]/g, resourceLink);
        console.log(`[Link Resolution] Replaced [LINK] with: ${resourceLink}`);
      } else {
        console.log(`[Link Resolution] Resource not found, keeping [LINK] placeholder`);
      }
    } else {
      console.log(`[Link Resolution] Block has no resourceName, keeping [LINK] placeholder`);
    }
  }

  // Resolve [WHOP_OWNER] placeholder
  if (resolvedMessage.includes('[WHOP_OWNER]')) {
    const adminName = await lookupAdminUser(experienceId);
    if (adminName) {
      resolvedMessage = resolvedMessage.replace(/\[WHOP_OWNER\]/g, adminName);
      console.log(`[Link Resolution] Replaced [WHOP_OWNER] with: ${adminName}`);
    } else {
      console.log(`[Link Resolution] Admin user not found, keeping [WHOP_OWNER] placeholder`);
    }
  }

  // Resolve [USER] placeholder
  if (resolvedMessage.includes('[USER]') && conversationId) {
    const userName = await lookupCurrentUser(conversationId);
    if (userName) {
      resolvedMessage = resolvedMessage.replace(/\[USER\]/g, userName);
      console.log(`[Link Resolution] Replaced [USER] with: ${userName}`);
    } else {
      console.log(`[Link Resolution] Current user not found, keeping [USER] placeholder`);
    }
  }

  return resolvedMessage;
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
    
    // Check if this is a VALUE_DELIVERY block - don't show options for these
    const currentPhase = detectConversationPhase(blockId, funnelFlow);
    const isValueDelivery = currentPhase === 'PHASE2';
    
    if (isValueDelivery) {
      console.log(`[DM Core] VALUE_DELIVERY block detected - not showing options for block ${blockId}`);
    }
    
    if (block.options && block.options.length > 0 && !isValueDelivery) {
      // Check if message already contains instruction line to avoid duplication
      const hasInstruction = message.toLowerCase().includes('answer') && 
                           (message.toLowerCase().includes('number') || message.toLowerCase().includes('keyword'));
      
      if (!hasInstruction) {
        message += "\n\nTo start, number/keyword\n";
      } else {
        message += "\n\n";
      }
      
      block.options.forEach((option, index) => {
        message += `${index + 1}. ${option.text}\n`;
      });
    }

    // Resolve [LINK], [WHOP_OWNER], and [USER] placeholders with actual values
    const resolvedMessage = await resolveLinkPlaceholders(message, block, experienceId, conversationId);

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
 * Generate dynamic re-prompt message with real options from current block
 */
async function generateDynamicRePromptMessage(
  conversationId: string,
  phase: 'PHASE1' | 'PHASE2',
  timing: number,
  experienceId: string
): Promise<string> {
  try {
    // Get conversation with funnel data
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
      with: {
        funnel: true,
      },
    });

    if (!conversation?.funnel?.flow) {
      // Fallback to static message if no funnel data
      return RE_PROMPT_CONFIG[phase][timing as keyof typeof RE_PROMPT_CONFIG[typeof phase]] || "Please respond to continue.";
    }

    const funnelFlow = conversation.funnel.flow as FunnelFlow;
    const currentBlockId = conversation.currentBlockId;

    if (!currentBlockId) {
      return RE_PROMPT_CONFIG[phase][timing as keyof typeof RE_PROMPT_CONFIG[typeof phase]] || "Please respond to continue.";
    }

    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) {
      return RE_PROMPT_CONFIG[phase][timing as keyof typeof RE_PROMPT_CONFIG[typeof phase]] || "Please respond to continue.";
    }

    // For PHASE1, generate dynamic message with real options
    if (phase === 'PHASE1' && timing === 10) {
      let message = "Hey! What's your niche?";
      
      if (currentBlock.options && currentBlock.options.length > 0) {
        message += "\n\nTo start, number/keyword\n";
        currentBlock.options.forEach((option, index) => {
          message += `${index + 1}. ${option.text}\n`;
        });
      }
      
      // Resolve placeholders for PHASE1 messages
      return await resolveLinkPlaceholders(message, currentBlock, experienceId, conversationId);
    }

    // For other timings, use static messages and resolve placeholders
    const staticMessage = RE_PROMPT_CONFIG[phase][timing as keyof typeof RE_PROMPT_CONFIG[typeof phase]] || "Please respond to continue.";
    return await resolveLinkPlaceholders(staticMessage, currentBlock, experienceId, conversationId);

  } catch (error) {
    console.error(`[DM Core] Error generating dynamic re-prompt message:`, error);
    // Fallback to static message
    return RE_PROMPT_CONFIG[phase][timing as keyof typeof RE_PROMPT_CONFIG[typeof phase]] || "Please respond to continue.";
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
    // Generate dynamic message with real options
    const rePromptMessage = await generateDynamicRePromptMessage(conversationId, phase, timing, experienceId);
    
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

    // First, try to validate the user response against current block options
    console.log(`[DM Core] Processing user response: "${messageContent}" for block: ${currentBlockId}`);
    console.log(`[DM Core] Current block options:`, currentBlock.options?.map((opt: any, i: number) => `${i + 1}. "${opt.text}"`) || 'No options');
    
    const validationResult = validateUserResponse(messageContent, currentBlock);
    console.log(`[DM Core] Validation result:`, { isValid: validationResult.isValid, selectedOption: validationResult.selectedOption?.text });
    
    // If user provided a valid option selection, process it normally
    if (validationResult.isValid && validationResult.selectedOption) {
      const selectedOption = validationResult.selectedOption;
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
    }

    // If no valid option was selected, check for phase-specific completion logic
    const currentPhase = detectConversationPhase(currentBlockId, funnelFlow);
    
    // Phase 1 completion: User responds to WELCOME → Send VALUE_DELIVERY message
    if (currentPhase === 'PHASE1') {
      return await handlePhase1Completion(conversationId, funnelFlow, experienceId);
    }
    
    // Phase 2 completion: User responds to VALUE_DELIVERY → Send TRANSITION message
    if (currentPhase === 'PHASE2') {
      return await handlePhase2Completion(conversationId, funnelFlow, experienceId);
    }

    // If no valid option and not a phase completion, handle as invalid response
    return await handleInvalidResponse(conversationId, experienceId);

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
    console.log(`[DM Core] Validating user response: "${userMessage}" -> normalized: "${normalizedInput}"`);
    console.log(`[DM Core] Available options:`, (currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. "${opt.text}" (normalized: "${normalizeInput(opt.text)}")`));

    // Check for exact text matches (case-insensitive)
    for (const option of currentBlock.options || []) {
      const normalizedOption = normalizeInput(option.text);
      console.log(`[DM Core] Comparing "${normalizedInput}" with "${normalizedOption}"`);
      if (normalizedOption === normalizedInput) {
        console.log(`[DM Core] Found exact text match: "${option.text}"`);
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
      console.log(`[DM Core] Number selection: ${numberMatch[1]} -> index ${optionIndex}`);
      if (optionIndex >= 0 && optionIndex < (currentBlock.options || []).length) {
        console.log(`[DM Core] Found number match: option ${optionIndex + 1} -> "${currentBlock.options[optionIndex].text}"`);
        return {
          isValid: true,
          selectedOption: currentBlock.options[optionIndex],
        };
      }
    }

    // Invalid response
    return {
      isValid: false,
      errorMessage: `To start, number/keyword\n${(currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. ${opt.text}`).join('\n')}`,
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
