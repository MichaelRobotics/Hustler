import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { resources, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";

/**
 * Validate WELCOME stage options against product_apps from conversation's whop_product_id
 * This endpoint is called by the frontend to get filtered options
 */
async function validateWelcomeOptionsHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { conversationId, whopProductId, options, funnelFlow } = await request.json();

    if (!conversationId || !whopProductId || !options || !funnelFlow) {
      return createErrorResponse(
        "MISSING_PARAMETERS",
        "conversationId, whopProductId, options, and funnelFlow are required"
      );
    }

    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    console.log(`[validate-welcome-options] Validating options for conversation ${conversationId} with productId ${whopProductId}`);

    // Get the experience record to get the UUID
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.warn(`[validate-welcome-options] No experience found with whopExperienceId: ${experienceId} - returning all options`);
      return NextResponse.json({ success: true, filteredOptions: options });
    }

    // Find the resource that matches the conversation's whop_product_id
    const matchingResource = await db.query.resources.findFirst({
      where: and(
        eq(resources.whopProductId, whopProductId),
        eq(resources.experienceId, experience.id)
      ),
      columns: {
        id: true,
        name: true,
        productApps: true,
        whopProductId: true
      }
    });

    if (!matchingResource) {
      console.log(`[validate-welcome-options] No resource found with whop_product_id: ${whopProductId} - returning all options`);
      return NextResponse.json({
        success: true,
        filteredOptions: options,
        validationLog: [`No resource found with whop_product_id: ${whopProductId}`]
      });
    }

    console.log(`[validate-welcome-options] Found matching resource: ${matchingResource.name} (ID: ${matchingResource.id})`);
    console.log(`[validate-welcome-options] Product apps: ${JSON.stringify(matchingResource.productApps)}`);

    // Get product_apps array from the resource
    const productApps = matchingResource.productApps as string[] || [];
    if (productApps.length === 0) {
      console.log(`[validate-welcome-options] No product_apps found in resource - returning all options`);
      return NextResponse.json({
        success: true,
        filteredOptions: options,
        validationLog: [`No product_apps found in resource: ${matchingResource.name}`]
      });
    }

    // Filter options based on their target blocks
    const filteredOptions: any[] = [];
    const validationLog: string[] = [];

    for (const option of options) {
      const targetBlockId = option.nextBlockId;
      
      if (!targetBlockId) {
        validationLog.push(`⚠️ Option "${option.text}" has no nextBlockId - allowing`);
        filteredOptions.push(option);
        continue;
      }
      
      const targetBlock = funnelFlow.blocks[targetBlockId];
      
      if (!targetBlock) {
        validationLog.push(`❌ Option "${option.text}" leads to non-existent block: ${targetBlockId}`);
        continue;
      }

      // Check if target block has resourceName
      if (!targetBlock.resourceName) {
        validationLog.push(`⚠️ Option "${option.text}" leads to block ${targetBlockId} without resourceName - allowing`);
        filteredOptions.push(option);
        continue;
      }

      // Check if resourceName matches any of the product_apps
      const resourceNameMatches = productApps.some(appName => 
        appName.toLowerCase().trim() === (targetBlock.resourceName || '').toLowerCase().trim()
      );

      if (resourceNameMatches) {
        validationLog.push(`✅ Option "${option.text}" -> "${targetBlock.resourceName}" matches product_apps`);
        filteredOptions.push(option);
      } else {
        validationLog.push(`❌ Option "${option.text}" -> "${targetBlock.resourceName}" does NOT match product_apps: [${productApps.join(', ')}]`);
      }
    }

    console.log(`[validate-welcome-options] Validation result: ${filteredOptions.length}/${options.length} valid options`);
    console.log(`[validate-welcome-options] Validation log:`, validationLog);

    return NextResponse.json({
      success: true,
      filteredOptions: filteredOptions,
      validationLog: validationLog,
      originalCount: options.length,
      filteredCount: filteredOptions.length
    });

  } catch (error) {
    console.error("Error validating welcome options:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

// Export the protected route handler
export const POST = withWhopAuth(validateWelcomeOptionsHandler);
