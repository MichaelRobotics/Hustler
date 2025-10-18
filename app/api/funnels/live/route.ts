import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, funnels, funnelResources, resources } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";

async function getLiveFunnelHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    console.log(`[get-live-funnel] Checking for deployed funnels in experience: ${experienceId}`);

    // Get the experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });
    
    if (!experience) {
      return NextResponse.json(
        { success: false, error: "Experience not found" },
        { status: 404 }
      );
    }

    // Find deployed funnels for this experience
    const deployedFunnels = await db.query.funnels.findMany({
      where: and(
        eq(funnels.experienceId, experience.id),
        eq(funnels.isDeployed, true)
      ),
      orderBy: (funnels, { desc }) => [desc(funnels.updatedAt)], // Get most recently updated
    });

    console.log(`[get-live-funnel] Found ${deployedFunnels.length} deployed funnels`);

    if (deployedFunnels.length === 0) {
      return NextResponse.json({
        success: true,
        hasLiveFunnel: false,
        funnelFlow: null,
        message: "No deployed funnels found for this experience"
      });
    }

    // Get the most recent deployed funnel
    const liveFunnel = deployedFunnels[0];
    const funnelFlow = liveFunnel.flow as FunnelFlow;

    console.log(`[get-live-funnel] Using funnel: ${liveFunnel.id} (${liveFunnel.name})`);

    // Fetch resources associated with this funnel
    const funnelResourcesList = await db.query.funnelResources.findMany({
      where: eq(funnelResources.funnelId, liveFunnel.id),
      with: {
        resource: true
      }
    });

    const resourcesList = funnelResourcesList.map(fr => fr.resource);

    console.log(`[get-live-funnel] Found ${resourcesList.length} resources for funnel ${liveFunnel.id}`);

    return NextResponse.json({
      success: true,
      hasLiveFunnel: true,
      funnelFlow: funnelFlow,
      resources: resourcesList,
      funnel: {
        id: liveFunnel.id,
        name: liveFunnel.name,
        isDeployed: liveFunnel.isDeployed,
        updatedAt: liveFunnel.updatedAt
      }
    });

  } catch (error) {
    console.error("Error getting live funnel:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

// Export the protected route handler
export const GET = withWhopAuth(getLiveFunnelHandler);

