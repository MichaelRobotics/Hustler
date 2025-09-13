/**
 * Tenant-Isolated DM Monitoring Service
 * 
 * Provides multi-tenant DM monitoring with proper isolation, rate limiting,
 * and memory management for production deployment on Vercel.
 * 
 * Multi-tenancy is achieved through experience-based scoping where each
 * experience (app installation) is a separate tenant.
 */

import { and, eq, lt } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, funnels, funnelInteractions, messages, experiences } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import type { FunnelBlock, FunnelBlockOption, FunnelFlow } from "../types/funnel";
import { updateConversationBlock, addMessage } from "./simplified-conversation-actions";
import { tenantMetricsCollector } from "../monitoring/tenant-metrics";

/**
 * Rate limiting configuration per tenant
 */
const RATE_LIMITS = {
  // Leave buffer for other operations (Whop limit is 20/10s)
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
} as const;

/**
 * Tenant-specific rate limiter
 */
class TenantRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Check if tenant can make a request
   */
  canMakeRequest(tenantId: string): boolean {
    const now = Date.now();
    const tenantRequests = this.requests.get(tenantId) || [];
    
    // Remove old requests outside the window
    const validRequests = tenantRequests.filter(time => now - time < this.windowMs);
    
    // Update the map
    this.requests.set(tenantId, validRequests);
    
    return validRequests.length < this.limit;
  }

  /**
   * Record a request for a tenant
   */
  recordRequest(tenantId: string): void {
    const now = Date.now();
    const tenantRequests = this.requests.get(tenantId) || [];
    tenantRequests.push(now);
    this.requests.set(tenantId, tenantRequests);
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilReset(tenantId: string): number {
    const tenantRequests = this.requests.get(tenantId) || [];
    if (tenantRequests.length < this.limit) return 0;
    
    const oldestRequest = Math.min(...tenantRequests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }

  /**
   * Clean up old data
   */
  cleanup(): void {
    const now = Date.now();
    for (const [tenantId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(tenantId);
      } else {
        this.requests.set(tenantId, validRequests);
      }
    }
  }
}

/**
 * Tenant-specific DM monitoring service
 */
class TenantDMMonitoringService {
  private readonly tenantId: string;
  private readonly experienceId: string;
  private readonly rateLimiter: TenantRateLimiter;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pollingStatus: Map<string, boolean> = new Map();
  private readonly INITIAL_POLLING_INTERVAL = 5000; // 5 seconds
  private readonly REGULAR_POLLING_INTERVAL = 10000; // 10 seconds
  private readonly INITIAL_POLLING_DURATION = 60000; // 1 minute

  constructor(tenantId: string, experienceId: string) {
    this.tenantId = tenantId;
    this.experienceId = experienceId;
    this.rateLimiter = new TenantRateLimiter(
      RATE_LIMITS.DM_POLLING.limit,
      RATE_LIMITS.DM_POLLING.windowMs
    );
  }

  /**
   * Start monitoring a user's DM conversation for this tenant
   */
  async startMonitoring(conversationId: string, whopUserId: string): Promise<void> {
    try {
      console.log(`[Tenant ${this.tenantId}] Starting DM monitoring for conversation ${conversationId}, user ${whopUserId}`);

      // Verify conversation belongs to this tenant
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.experienceId, this.experienceId)
        ),
      });

      if (!conversation) {
        console.error(`[Tenant ${this.tenantId}] Conversation ${conversationId} not found or doesn't belong to this tenant`);
        return;
      }

      // Stop any existing monitoring for this conversation
      await this.stopMonitoring(conversationId);

      // Mark as active
      this.pollingStatus.set(conversationId, true);
      
      // Update metrics
      tenantMetricsCollector.updateActiveConversations(
        this.tenantId, 
        this.experienceId, 
        this.pollingStatus.size
      );

      // Start with initial polling interval
      const startTime = Date.now();
      
      const poll = async () => {
        if (!this.pollingStatus.get(conversationId)) {
          return; // Stop polling if disabled
        }

        try {
          await this.pollForMessages(conversationId, whopUserId);
        } catch (error) {
          console.error(`[Tenant ${this.tenantId}] Error polling messages for conversation ${conversationId}:`, error);
          // Continue polling even if one poll fails
        }

        // Schedule next poll
        if (this.pollingStatus.get(conversationId)) {
          const elapsed = Date.now() - startTime;
          const interval = elapsed < this.INITIAL_POLLING_DURATION 
            ? this.INITIAL_POLLING_INTERVAL 
            : this.REGULAR_POLLING_INTERVAL;

          const timeoutId = setTimeout(poll, interval);
          this.pollingIntervals.set(conversationId, timeoutId);
        }
      };

      // Start first poll immediately
      await poll();
    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error starting DM monitoring for conversation ${conversationId}:`, error);
      this.pollingStatus.set(conversationId, false);
    }
  }

  /**
   * Stop monitoring a user's DM conversation
   */
  async stopMonitoring(conversationId: string): Promise<void> {
    try {
      console.log(`[Tenant ${this.tenantId}] Stopping DM monitoring for conversation ${conversationId}`);

      // Clear polling status
      this.pollingStatus.set(conversationId, false);

      // Clear existing interval
      const existingInterval = this.pollingIntervals.get(conversationId);
      if (existingInterval) {
        clearTimeout(existingInterval);
        this.pollingIntervals.delete(conversationId);
      }
      
      // Update metrics
      tenantMetricsCollector.updateActiveConversations(
        this.tenantId, 
        this.experienceId, 
        this.pollingStatus.size
      );
    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error stopping DM monitoring for conversation ${conversationId}:`, error);
    }
  }

  /**
   * Poll for new DM messages with rate limiting
   */
  private async pollForMessages(conversationId: string, whopUserId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check rate limit
      if (!this.rateLimiter.canMakeRequest(this.tenantId)) {
        const waitTime = this.rateLimiter.getTimeUntilReset(this.tenantId);
        console.log(`[Tenant ${this.tenantId}] Rate limited, waiting ${waitTime}ms`);
        
        // Record rate limit hit
        tenantMetricsCollector.recordRateLimitHit(this.tenantId, this.experienceId);
        return;
      }

      // Record the request
      this.rateLimiter.recordRequest(this.tenantId);

      // Get conversation details (tenant-scoped)
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.experienceId, this.experienceId)
        ),
        with: {
          funnel: true,
        },
      });

      if (!conversation) {
        console.error(`[Tenant ${this.tenantId}] Conversation ${conversationId} not found`);
        await this.stopMonitoring(conversationId);
        return;
      }

      // Check if conversation is still active
      if (conversation.status !== "active") {
        console.log(`[Tenant ${this.tenantId}] Conversation ${conversationId} is no longer active, stopping monitoring`);
        await this.stopMonitoring(conversationId);
        return;
      }

      // Get DM conversations from Whop using the SDK
      const dmConversations = await whopSdk.messages.listDirectMessageConversations();
      
      // Find conversation by looking for the user in feedMembers
      const userConversation = dmConversations.find(conv => {
        const hasAgent = conv.feedMembers.some(member => member.username === 'tests-agentb2');
        const hasUser = conv.feedMembers.some(member => 
          member.username === whopUserId || 
          member.id === whopUserId
        );
        const lastMessageFromUser = conv.lastMessage && conv.lastMessage.userId === whopUserId;
        
        return hasAgent && (hasUser || lastMessageFromUser);
      });

      if (!userConversation) {
        console.log(`[Tenant ${this.tenantId}] No DM conversation found with user ${whopUserId}`);
        return;
      }

      // Check if there's a new message from the user
      const lastMessage = userConversation.lastMessage;
      const isMessageFromUser = lastMessage && lastMessage.userId === whopUserId;
      const userMember = userConversation.feedMembers.find(member => 
        member.id === whopUserId || member.username === whopUserId
      );
      const isMessageFromUserMember = lastMessage && userMember && lastMessage.userId === userMember.id;
      
      if (lastMessage && (isMessageFromUser || isMessageFromUserMember) && lastMessage.content) {
        console.log(`[Tenant ${this.tenantId}] New message from user ${whopUserId}: "${lastMessage.content}"`);
        
        // Process the new message
        await this.handleDMResponse(conversationId, lastMessage.content, whopUserId);
      }

    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error polling messages for conversation ${conversationId}:`, error);
      
      // Record error in metrics
      tenantMetricsCollector.recordError(this.tenantId, this.experienceId, error as Error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("rate limit")) {
          console.warn(`[Tenant ${this.tenantId}] Rate limited when polling messages, will retry on next interval`);
          tenantMetricsCollector.recordRateLimitHit(this.tenantId, this.experienceId);
        } else if (error.message.includes("unauthorized")) {
          console.error(`[Tenant ${this.tenantId}] Unauthorized when polling messages, stopping monitoring`);
          await this.stopMonitoring(conversationId);
        }
      }
    } finally {
      // Record request metrics
      const responseTime = Date.now() - startTime;
      tenantMetricsCollector.recordRequest(this.tenantId, this.experienceId, responseTime);
    }
  }

  /**
   * Handle DM response from user
   */
  private async handleDMResponse(
    conversationId: string, 
    messageContent: string, 
    whopUserId: string
  ): Promise<void> {
    try {
      console.log(`[Tenant ${this.tenantId}] Processing DM response from user ${whopUserId}: ${messageContent}`);

      // Get conversation and funnel details (tenant-scoped)
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.experienceId, this.experienceId)
        ),
        with: {
          funnel: true,
        },
      });

      if (!conversation || !conversation.funnel) {
        console.error(`[Tenant ${this.tenantId}] Conversation or funnel not found for ${conversationId}`);
        return;
      }

      // Process the user response through the funnel system
      await this.processUserResponse(conversationId, messageContent, conversation.funnel.flow as FunnelFlow);

    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error handling DM response for conversation ${conversationId}:`, error);
    }
  }

  /**
   * Process user response through funnel system
   */
  private async processUserResponse(
    conversationId: string, 
    messageContent: string, 
    funnelFlow: FunnelFlow
  ): Promise<void> {
    try {
      // Get current conversation state
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.experienceId, this.experienceId)
        ),
      });

      if (!conversation || !conversation.currentBlockId) {
        console.error(`[Tenant ${this.tenantId}] Conversation or current block not found`);
        return;
      }

      const currentBlock = funnelFlow.blocks[conversation.currentBlockId];
      if (!currentBlock) {
        console.error(`[Tenant ${this.tenantId}] Current block ${conversation.currentBlockId} not found in funnel`);
        return;
      }

      // Check if this is a TRANSITION block - stop monitoring if so
      if (currentBlock.type === 'TRANSITION') {
        console.log(`[Tenant ${this.tenantId}] Conversation reached TRANSITION stage, stopping DM monitoring`);
        await this.stopMonitoring(conversationId);
        return;
      }

      // Find matching option
      const matchingOption = currentBlock.options?.find(option => 
        option.text.toLowerCase().trim() === messageContent.toLowerCase().trim() ||
        option.value.toLowerCase().trim() === messageContent.toLowerCase().trim()
      );

      if (matchingOption) {
        // Valid response - navigate to next block
        await this.navigateToNextBlock(conversationId, matchingOption, funnelFlow);
      } else {
        // Invalid response - handle progressively
        await this.handleInvalidResponse(conversationId, messageContent);
      }

    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error processing user response:`, error);
    }
  }

  /**
   * Navigate to next block in funnel
   */
  private async navigateToNextBlock(
    conversationId: string, 
    selectedOption: FunnelBlockOption, 
    funnelFlow: FunnelFlow
  ): Promise<void> {
    try {
      const nextBlockId = selectedOption.nextBlockId;
      if (!nextBlockId) {
        console.error(`[Tenant ${this.tenantId}] No next block ID found for option`);
        return;
      }

      const nextBlock = funnelFlow.blocks[nextBlockId];
      if (!nextBlock) {
        console.error(`[Tenant ${this.tenantId}] Next block ${nextBlockId} not found in funnel`);
        return;
      }

      // Update conversation block
      await updateConversationBlock(conversationId, nextBlockId);

      // Add user message
      await addMessage(conversationId, "user", selectedOption.text);

      // Add bot response
      await addMessage(conversationId, "bot", nextBlock.message);

      // Check if this is a TRANSITION block - stop monitoring if so
      if (nextBlock.type === 'TRANSITION') {
        console.log(`[Tenant ${this.tenantId}] Conversation reached TRANSITION stage, stopping DM monitoring`);
        await this.stopMonitoring(conversationId);
        return;
      }

      // Send next message to user via DM
      await this.sendNextMessage(conversationId, nextBlock);

    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error navigating to next block:`, error);
    }
  }

  /**
   * Send next message to user via DM
   */
  private async sendNextMessage(conversationId: string, nextBlock: FunnelBlock): Promise<void> {
    try {
      // Check rate limit for message sending
      if (!this.rateLimiter.canMakeRequest(this.tenantId)) {
        console.log(`[Tenant ${this.tenantId}] Rate limited for message sending, skipping`);
        return;
      }

      // Record the request
      this.rateLimiter.recordRequest(this.tenantId);

      // Format message with options
      let message = nextBlock.message;
      if (nextBlock.options && nextBlock.options.length > 0) {
        message += "\n\nPlease choose from the following options:\n";
        nextBlock.options.forEach((option, index) => {
          message += `${index + 1}. ${option.text}\n`;
        });
      }

      // Send DM to user
      // Note: This would need to be implemented based on your DM sending mechanism
      console.log(`[Tenant ${this.tenantId}] Would send DM: ${message}`);

    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error sending next message:`, error);
    }
  }

  /**
   * Handle invalid user response
   */
  private async handleInvalidResponse(conversationId: string, messageContent: string): Promise<void> {
    try {
      // Add user message
      await addMessage(conversationId, "user", messageContent);

      // Add error message
      await addMessage(conversationId, "bot", "Please choose from the provided options above.");

      // Send error message to user via DM
      console.log(`[Tenant ${this.tenantId}] Would send error DM for invalid response: ${messageContent}`);

    } catch (error) {
      console.error(`[Tenant ${this.tenantId}] Error handling invalid response:`, error);
    }
  }

  /**
   * Get monitoring status for this tenant
   */
  getMonitoringStatus(): Map<string, boolean> {
    return new Map(this.pollingStatus);
  }

  /**
   * Clean up resources for this tenant
   */
  async cleanup(): Promise<void> {
    console.log(`[Tenant ${this.tenantId}] Cleaning up DM monitoring service`);
    
    // Stop all monitoring
    for (const conversationId of this.pollingStatus.keys()) {
      await this.stopMonitoring(conversationId);
    }
    
    // Clear all data
    this.pollingIntervals.clear();
    this.pollingStatus.clear();
  }
}

/**
 * Multi-tenant DM monitoring manager
 */
class MultiTenantDMMonitoringManager {
  private tenantServices: Map<string, TenantDMMonitoringService> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup monitoring
    this.startCleanupMonitoring();
  }

  /**
   * Get or create tenant service
   */
  private getTenantService(experienceId: string): TenantDMMonitoringService {
    if (!this.tenantServices.has(experienceId)) {
      const service = new TenantDMMonitoringService(experienceId, experienceId);
      this.tenantServices.set(experienceId, service);
    }
    return this.tenantServices.get(experienceId)!;
  }

  /**
   * Start monitoring for a specific tenant
   */
  async startMonitoring(conversationId: string, whopUserId: string, experienceId: string): Promise<void> {
    const tenantService = this.getTenantService(experienceId);
    await tenantService.startMonitoring(conversationId, whopUserId);
  }

  /**
   * Stop monitoring for a specific tenant
   */
  async stopMonitoring(conversationId: string, experienceId: string): Promise<void> {
    const tenantService = this.tenantServices.get(experienceId);
    if (tenantService) {
      await tenantService.stopMonitoring(conversationId);
    }
  }

  /**
   * Get monitoring status for all tenants
   */
  getMonitoringStatus(): Record<string, Map<string, boolean>> {
    const status: Record<string, Map<string, boolean>> = {};
    for (const [tenantId, service] of this.tenantServices.entries()) {
      status[tenantId] = service.getMonitoringStatus();
    }
    return status;
  }

  /**
   * Start cleanup monitoring
   */
  private startCleanupMonitoring(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupInactiveTenants();
    }, MEMORY_CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up inactive tenants
   */
  private async cleanupInactiveTenants(): Promise<void> {
    console.log("Cleaning up inactive tenant services");
    
    for (const [tenantId, service] of this.tenantServices.entries()) {
      const status = service.getMonitoringStatus();
      const hasActiveConversations = Array.from(status.values()).some(active => active);
      
      if (!hasActiveConversations) {
        console.log(`Cleaning up inactive tenant service: ${tenantId}`);
        await service.cleanup();
        this.tenantServices.delete(tenantId);
      }
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    console.log("Cleaning up multi-tenant DM monitoring manager");
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    for (const service of this.tenantServices.values()) {
      await service.cleanup();
    }
    
    this.tenantServices.clear();
  }
}

// Export singleton instance
export const multiTenantDMMonitoringManager = new MultiTenantDMMonitoringManager();

// Export for backward compatibility
export { TenantDMMonitoringService, MultiTenantDMMonitoringManager };
