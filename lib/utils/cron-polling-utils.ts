/**
 * Shared utilities for cron job polling with optimizations
 */

import { whopSdk } from "@/lib/whop-sdk";
import { 
  processUserResponse, 
  sendRePromptMessage, 
  getConversationAge, 
  shouldSendRePrompt,
  sendNextBlockMessage 
} from "./dm-monitoring-core";
import { detectConversationPhase } from "@/lib/actions/simplified-conversation-actions";
import { rateLimiter } from "@/lib/middleware/rate-limiter";
import { tenantMetricsCollector } from "@/lib/monitoring/tenant-metrics";
import type { FunnelFlow } from "@/lib/types/funnel";

/**
 * Rate limiting configuration for cron jobs
 */
const CRON_RATE_LIMITS = {
  DM_POLLING: { limit: 15, windowMs: 10000 }, // 15 requests per 10 seconds
  MESSAGE_SENDING: { limit: 10, windowMs: 10000 }, // 10 requests per 10 seconds
} as const;

/**
 * Memory management configuration
 */
const MEMORY_CONFIG = {
  MAX_CONVERSATIONS_PER_TENANT: 100,
  CLEANUP_INTERVAL_MS: 300000, // 5 minutes
  CONVERSATION_TIMEOUT_HOURS: 24,
  MAX_MEMORY_USAGE_MB: 512, // 512MB per tenant
} as const;

/**
 * Memory usage tracker for cron jobs
 */
class CronMemoryManager {
  private tenantMemoryUsage = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Track memory usage for a tenant
   */
  trackMemoryUsage(tenantId: string, usage: number): void {
    this.tenantMemoryUsage.set(tenantId, usage);
  }

  /**
   * Get memory usage for a tenant
   */
  getMemoryUsage(tenantId: string): number {
    return this.tenantMemoryUsage.get(tenantId) || 0;
  }

  /**
   * Check if tenant is within memory limits
   */
  isWithinMemoryLimits(tenantId: string): boolean {
    const usage = this.getMemoryUsage(tenantId);
    return usage < MEMORY_CONFIG.MAX_MEMORY_USAGE_MB;
  }

  /**
   * Start cleanup monitoring
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, MEMORY_CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up old memory usage data
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoffTime = now - (24 * 60 * 60 * 1000); // 24 hours ago

    // Remove old entries (simplified - in real implementation, track timestamps)
    if (this.tenantMemoryUsage.size > 1000) {
      // Keep only the most recent 1000 entries
      const entries = Array.from(this.tenantMemoryUsage.entries());
      this.tenantMemoryUsage.clear();
      
      // Keep the most recent entries
      entries.slice(-1000).forEach(([tenantId, usage]) => {
        this.tenantMemoryUsage.set(tenantId, usage);
      });
    }

    console.log(`[MemoryManager] Cleaned up, ${this.tenantMemoryUsage.size} tenants tracked`);
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalTenants: number;
    averageUsage: number;
    maxUsage: number;
    overLimitTenants: number;
  } {
    const usages = Array.from(this.tenantMemoryUsage.values());
    const totalTenants = usages.length;
    const averageUsage = totalTenants > 0 ? usages.reduce((a, b) => a + b, 0) / totalTenants : 0;
    const maxUsage = totalTenants > 0 ? Math.max(...usages) : 0;
    const overLimitTenants = usages.filter(usage => usage > MEMORY_CONFIG.MAX_MEMORY_USAGE_MB).length;

    return {
      totalTenants,
      averageUsage: Math.round(averageUsage * 100) / 100,
      maxUsage,
      overLimitTenants,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.tenantMemoryUsage.clear();
  }
}

// Export singleton instance
export const cronMemoryManager = new CronMemoryManager();

/**
 * Error recovery and retry logic
 */
class ErrorRecoveryManager {
  private retryAttempts = new Map<string, number>();
  private circuitBreaker = new Map<string, { failures: number; lastFailure: number; state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' }>();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    tenantId: string,
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ success: boolean; result?: T; error?: string; retryCount: number }> {
    const key = `${tenantId}-${operationName}`;
    const currentAttempts = this.retryAttempts.get(key) || 0;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(tenantId, operationName)) {
      return {
        success: false,
        error: 'Circuit breaker is open',
        retryCount: currentAttempts
      };
    }

    try {
      const result = await operation();
      
      // Reset retry attempts on success
      this.retryAttempts.delete(key);
      this.resetCircuitBreaker(tenantId, operationName);
      
      return {
        success: true,
        result,
        retryCount: currentAttempts
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newAttempts = currentAttempts + 1;
      this.retryAttempts.set(key, newAttempts);

      // Record failure in circuit breaker
      this.recordFailure(tenantId, operationName);

      if (newAttempts < this.MAX_RETRY_ATTEMPTS) {
        // Exponential backoff
        const delay = Math.pow(2, newAttempts) * 1000; // 2s, 4s, 8s
        console.log(`[ErrorRecovery] Retrying ${operationName} for tenant ${tenantId} in ${delay}ms (attempt ${newAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(tenantId, operation, operationName);
      } else {
        console.error(`[ErrorRecovery] Max retry attempts reached for ${operationName} (tenant ${tenantId})`);
        return {
          success: false,
          error: errorMessage,
          retryCount: newAttempts
        };
      }
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(tenantId: string, operationName: string): boolean {
    const key = `${tenantId}-${operationName}`;
    const breaker = this.circuitBreaker.get(key);
    
    if (!breaker) return false;
    
    if (breaker.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - breaker.lastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        breaker.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Record a failure
   */
  private recordFailure(tenantId: string, operationName: string): void {
    const key = `${tenantId}-${operationName}`;
    const breaker = this.circuitBreaker.get(key) || { failures: 0, lastFailure: 0, state: 'CLOSED' as const };
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.state = 'OPEN';
      console.warn(`[ErrorRecovery] Circuit breaker opened for ${operationName} (tenant ${tenantId})`);
    }
    
    this.circuitBreaker.set(key, breaker);
  }

  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(tenantId: string, operationName: string): void {
    const key = `${tenantId}-${operationName}`;
    const breaker = this.circuitBreaker.get(key);
    
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'CLOSED';
      this.circuitBreaker.set(key, breaker);
    }
  }

  /**
   * Get retry statistics
   */
  getRetryStats(): {
    totalRetryAttempts: number;
    activeCircuitBreakers: number;
    tenantsWithRetries: number;
  } {
    const totalRetryAttempts = Array.from(this.retryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0);
    const activeCircuitBreakers = Array.from(this.circuitBreaker.values()).filter(breaker => breaker.state === 'OPEN').length;
    const tenantsWithRetries = this.retryAttempts.size;

    return {
      totalRetryAttempts,
      activeCircuitBreakers,
      tenantsWithRetries,
    };
  }
}

// Export singleton instance
export const errorRecoveryManager = new ErrorRecoveryManager();

/**
 * Process a conversation with complete DM monitoring functionality and optimizations
 */
export async function processConversationPolling(
  conversation: any, 
  funnelFlow: FunnelFlow, 
  phase: 'PHASE1' | 'PHASE2'
): Promise<string> {
  const startTime = Date.now();
  const tenantId = conversation.experienceId;
  
  try {
    console.log(`[Cron Polling] Processing ${phase} conversation ${conversation.id} for tenant ${tenantId}`);

    // Check memory limits
    if (!cronMemoryManager.isWithinMemoryLimits(tenantId)) {
      console.warn(`[Cron Polling] Memory limit exceeded for tenant ${tenantId}, skipping processing`);
      tenantMetricsCollector.recordError(tenantId, tenantId, new Error('Memory limit exceeded'));
      return "Memory limit exceeded - skipping processing";
    }

    // Check rate limit for DM polling
    if (!rateLimiter.isAllowed(tenantId, 'dm_polling', CRON_RATE_LIMITS.DM_POLLING.limit, CRON_RATE_LIMITS.DM_POLLING.windowMs)) {
      const waitTime = rateLimiter.getResetTime(tenantId, 'dm_polling');
      console.log(`[Cron Polling] Rate limited for tenant ${tenantId}, waiting ${waitTime ? waitTime - Date.now() : 0}ms`);
      tenantMetricsCollector.recordRateLimitHit(tenantId, tenantId);
      return "Rate limited - skipping processing";
    }

    // Check if re-prompt should be sent
    const rePromptCheck = shouldSendRePrompt(conversation, phase);
    if (rePromptCheck.shouldSend) {
      console.log(`[Cron Polling] Sending re-prompt for conversation ${conversation.id} at ${rePromptCheck.timing} minutes`);
      
      // Check rate limit for message sending
      if (!rateLimiter.isAllowed(tenantId, 'message_sending', CRON_RATE_LIMITS.MESSAGE_SENDING.limit, CRON_RATE_LIMITS.MESSAGE_SENDING.windowMs)) {
        console.log(`[Cron Polling] Rate limited for message sending, skipping re-prompt`);
        tenantMetricsCollector.recordRateLimitHit(tenantId, tenantId);
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
        tenantMetricsCollector.recordError(tenantId, tenantId, new Error(rePromptResult.error || 'Unknown re-prompt error'));
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
      tenantMetricsCollector.recordError(tenantId, tenantId, new Error(dmPollingResult.error || 'DM polling failed'));
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
      
      console.log(`[Cron Polling] Processing user message: "${messageContent}"`);
      
      // Use error recovery for user response processing
      const processResult = await errorRecoveryManager.executeWithRetry(
        tenantId,
        () => processUserResponse(conversation.id, messageContent, funnelFlow, conversation.experienceId),
        'process_user_response'
      );
      
      if (processResult.success) {
        return `Processed user message: "${messageContent}" -> Next block: ${processResult.result?.nextBlockId || 'Completed'} (${processResult.retryCount} retries)`;
      } else {
        tenantMetricsCollector.recordError(tenantId, tenantId, new Error(processResult.error || 'Unknown processing error'));
        return `Failed to process user message: ${processResult.error} (${processResult.retryCount} retries)`;
      }
    }

    return "No new user messages found";
  } catch (error) {
    console.error(`[Cron Polling] Error processing conversation ${conversation.id}:`, error);
    tenantMetricsCollector.recordError(tenantId, tenantId, error as Error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  } finally {
    // Record metrics and memory usage
    const responseTime = Date.now() - startTime;
    tenantMetricsCollector.recordRequest(tenantId, tenantId, responseTime);
    
    // Track memory usage (simplified - in real implementation, calculate actual usage)
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
    cronMemoryManager.trackMemoryUsage(tenantId, memoryUsage);
  }
}

/**
 * Process Phase 1 conversation with specific logic
 */
export async function processPhase1Conversation(conversation: any, funnelFlow: FunnelFlow): Promise<string> {
  return await processConversationPolling(conversation, funnelFlow, 'PHASE1');
}

/**
 * Process Phase 2 conversation with specific logic
 */
export async function processPhase2Conversation(conversation: any, funnelFlow: FunnelFlow): Promise<string> {
  return await processConversationPolling(conversation, funnelFlow, 'PHASE2');
}
