/**
 * Affiliate DM Core Utilities
 * 
 * Handles sending DM messages to users with affiliate links and app install links
 * after they receive an OFFER in the conversation.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, messages, resources, experiences } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import { addMessage } from "../actions/simplified-conversation-actions";
import { AFFILIATE_CONFIG, getAppInstallLink, getCommissionRateString } from "../config/affiliate-config";

/**
 * Generate affiliate link with commission tracking
 * Uses the correct Whop affiliate format: https://whop.com/{product-slug}?a={affiliate-id}
 */
export async function generateAffiliateLink(
  resourceLink: string,
  whopUserId: string,
  experienceId: string
): Promise<string> {
  try {
    // Get experience details for affiliate tracking
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.id, experienceId),
    });

    if (!experience) {
      throw new Error("Experience not found");
    }

    // Check if this is already a Whop product link
    if (resourceLink.includes('whop.com/')) {
      // Extract product slug from existing Whop link
      const url = new URL(resourceLink);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const productSlug = pathParts[0]; // e.g., "app-mafia-997"
      
      // Create new Whop affiliate link with correct format
      const affiliateLink = `https://whop.com/${productSlug}?a=${whopUserId}`;
      console.log(`[Affiliate DM] Generated Whop affiliate link: ${affiliateLink}`);
      return affiliateLink;
    } else {
      // For non-Whop links, add standard affiliate parameters
      const url = new URL(resourceLink);
      url.searchParams.set('a', whopUserId); // Use 'a' parameter like Whop
      url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.AFFILIATE, whopUserId);
      url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.EXPERIENCE, experience.whopExperienceId);
      url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.COMMISSION, (AFFILIATE_CONFIG.COMMISSION_RATE * 100).toString());
      url.searchParams.set(AFFILIATE_CONFIG.TRACKING_PARAMS.SOURCE, AFFILIATE_CONFIG.TRACKING_PARAMS.SOURCE_VALUE);
      
      console.log(`[Affiliate DM] Generated standard affiliate link: ${url.toString()}`);
      return url.toString();
    }
  } catch (error) {
    console.error("Error generating affiliate link:", error);
    return resourceLink; // Return original link if generation fails
  }
}

/**
 * Send affiliate DM to user after OFFER stage
 */
export async function sendAffiliateDM(
  conversationId: string,
  resourceName: string,
  experienceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Affiliate DM] Sending affiliate DM for conversation ${conversationId}, resource: ${resourceName}`);

    // Get conversation details
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

    // Look up the resource to get the original link
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.name, resourceName),
        eq(resources.experienceId, experienceId)
      ),
    });

    if (!resource) {
      return { success: false, error: "Resource not found" };
    }

    // Generate affiliate link
    const affiliateLink = await generateAffiliateLink(
      resource.link,
      whopUserId,
      experienceId
    );

    // Create the DM message
    const appInstallLink = getAppInstallLink(experienceId);
    const dmMessage = AFFILIATE_CONFIG.MESSAGE_TEMPLATE
      .replace('{affiliateLink}', affiliateLink)
      .replace('{appInstallLink}', appInstallLink);

    // Send DM to user
    await whopSdk.messages.sendDirectMessageToUser({
      toUserIdOrUsername: whopUserId,
      message: dmMessage,
    });

    // Record the DM message in the conversation
    await addMessage(conversationId, "bot", dmMessage);

    console.log(`[Affiliate DM] Successfully sent affiliate DM to user ${whopUserId}`);
    return { success: true };

  } catch (error) {
    console.error(`[Affiliate DM] Error sending affiliate DM for conversation ${conversationId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if user has already received affiliate DM for this resource
 */
export async function hasReceivedAffiliateDM(
  conversationId: string,
  resourceName: string
): Promise<boolean> {
  try {
    const existingMessage = await db.query.messages.findFirst({
      where: and(
        eq(messages.conversationId, conversationId),
        eq(messages.type, "bot")
      ),
      orderBy: (messages: any, { desc }: any) => [desc(messages.createdAt)],
    });

    if (!existingMessage) {
      return false;
    }

    // Check if the message contains affiliate DM content
    const messageContent = existingMessage.content;
    const commissionRate = getCommissionRateString();
    return messageContent.includes("Your Affiliate Link") && 
           messageContent.includes(commissionRate);
  } catch (error) {
    console.error("Error checking affiliate DM status:", error);
    return false;
  }
}

/**
 * Send affiliate DM with delay to avoid overwhelming users
 */
export async function sendDelayedAffiliateDM(
  conversationId: string,
  resourceName: string,
  experienceId: string,
  delayMinutes: number = 5
): Promise<void> {
  try {
    // Check if user already received affiliate DM
    const alreadyReceived = await hasReceivedAffiliateDM(conversationId, resourceName);
    if (alreadyReceived) {
      console.log(`[Affiliate DM] User already received affiliate DM for ${resourceName}`);
      return;
    }

    // Schedule the DM with delay
    setTimeout(async () => {
      try {
        await sendAffiliateDM(conversationId, resourceName, experienceId);
      } catch (error) {
        console.error("Error in delayed affiliate DM:", error);
      }
    }, delayMinutes * 60 * 1000); // Convert minutes to milliseconds

    console.log(`[Affiliate DM] Scheduled affiliate DM for ${delayMinutes} minutes from now`);
  } catch (error) {
    console.error("Error scheduling affiliate DM:", error);
  }
}
