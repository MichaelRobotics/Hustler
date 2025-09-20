import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { db } from "@/lib/supabase/db-server";
import { conversations, resources } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import type { FunnelFlow } from "@/lib/types/funnel";

async function generateAffiliateLinkHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { conversationId, experienceId, funnelFlow } = await request.json();

    if (!conversationId || !experienceId || !funnelFlow) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(`[AFFILIATE-API] Generating affiliate link for conversation ${conversationId}`);

    // Find the OFFER stage block
    const offerStage = funnelFlow.stages.find((stage: any) => stage.name === 'OFFER');
    if (!offerStage) {
      console.log(`[AFFILIATE-API] No OFFER stage found in funnel flow`);
      return NextResponse.json({ success: false, reason: "No OFFER stage found" });
    }

    // Find the first OFFER block with a resourceName
    const offerBlock = offerStage.blockIds
      .map((blockId: string) => funnelFlow.blocks[blockId])
      .find((block: any) => block && block.resourceName);
      
    if (!offerBlock) {
      console.log(`[AFFILIATE-API] No OFFER block with resourceName found`);
      return NextResponse.json({ success: false, reason: "No OFFER block with resourceName found" });
    }

    console.log(`[AFFILIATE-API] Found OFFER block: ${offerBlock.id} with resourceName: ${offerBlock.resourceName}`);

    // Lookup resource by name and experience
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.name, offerBlock.resourceName!),
        eq(resources.experienceId, experienceId)
      ),
    });

    if (!resource) {
      console.log(`[AFFILIATE-API] Resource not found: ${offerBlock.resourceName}`);
      return NextResponse.json({ success: false, reason: "Resource not found" });
    }

    console.log(`[AFFILIATE-API] Found resource: ${resource.name} with link: ${resource.link}`);

    // Check if link already has affiliate parameters
    const hasAffiliate = resource.link.includes('app=') || resource.link.includes('ref=');

    let affiliateLink = resource.link;

    if (!hasAffiliate) {
      console.log(`[AFFILIATE-API] Adding affiliate parameters to resource link`);

      // Get affiliate app ID (simplified - use experience ID directly)
      const affiliateAppId = experienceId;
      console.log(`[AFFILIATE-API] Using experience ID as affiliate app ID: ${affiliateAppId}`);

      // Add affiliate parameter to the link
      const url = new URL(resource.link);
      url.searchParams.set('app', affiliateAppId);
      affiliateLink = url.toString();
    } else {
      console.log(`[AFFILIATE-API] Resource link already has affiliate parameters, using as-is`);
    }

    console.log(`[AFFILIATE-API] Generated affiliate link: ${affiliateLink}`);

    // Store the affiliate link in the conversation
    console.log(`[AFFILIATE-API] Storing affiliate link in conversation ${conversationId}`);
    await db.update(conversations)
      .set({
        affiliateLink: affiliateLink,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId));

    console.log(`[AFFILIATE-API] Successfully stored affiliate link for OFFER stage`);

    return NextResponse.json({ 
      success: true, 
      affiliateLink: affiliateLink 
    });

  } catch (error) {
    console.error(`[AFFILIATE-API] Error generating affiliate link:`, error);
    return NextResponse.json(
      { error: "Failed to generate affiliate link" },
      { status: 500 }
    );
  }
}

export const POST = withWhopAuth(generateAffiliateLinkHandler);
