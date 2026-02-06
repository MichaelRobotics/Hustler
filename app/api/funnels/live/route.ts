import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, funnelResources, funnels, resources } from "@/lib/supabase/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";
import { findFunnelForTrigger } from "@/lib/helpers/conversation-trigger";

function effectiveLink(r: { link?: string | null; whopProductId?: string | null; purchaseUrl?: string | null }): string {
  const link = (r.link ?? "").trim();
  if (link) return link;
  if (r.whopProductId) return "";
  return (r.purchaseUrl ?? "").trim() || "";
}

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

    console.log(`[get-live-funnel] Resolving app_entry funnel for experience: ${experienceId}`);

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

    // Use app_entry trigger only (no userId/whopUserId in preview); no fallback to first deployed
    const liveFunnel = await findFunnelForTrigger(experience.id, "app_entry");

    if (!liveFunnel?.flow) {
      return NextResponse.json({
        success: true,
        hasLiveFunnel: false,
        funnelFlow: null,
        message: "No funnel with app_entry trigger found for this experience",
      });
    }

    const funnelFlow = liveFunnel.flow as FunnelFlow;

    // Fetch funnel row for name, merchantType, and updatedAt
    const funnelRow = await db.query.funnels.findFirst({
      where: eq(funnels.id, liveFunnel.id),
      columns: { id: true, name: true, isDeployed: true, updatedAt: true, merchantType: true },
    });

    console.log(`[get-live-funnel] Using app_entry funnel: ${liveFunnel.id} (${funnelRow?.name})`);

    const funnelResourcesList = await db.query.funnelResources.findMany({
      where: eq(funnelResources.funnelId, liveFunnel.id),
      with: {
        resource: true,
      },
    });

    const resourcesMap = new Map<string, {
      id: string;
      name: string;
      type: string;
      category: string;
      link: string;
      code?: string;
      description?: string;
      image?: string;
      storageUrl?: string;
      price?: string;
    }>();

    for (const fr of funnelResourcesList) {
      const r = (fr as { resource: Record<string, unknown> }).resource;
      if (r && typeof r === "object" && r.id && !resourcesMap.has(String(r.id))) {
        resourcesMap.set(String(r.id), {
          id: String(r.id),
          name: String(r.name ?? ""),
          type: String(r.type ?? "MY_PRODUCTS"),
          category: String(r.category ?? "PAID"),
          link: effectiveLink({
            link: r.link != null ? String(r.link) : null,
            whopProductId: r.whopProductId != null ? String(r.whopProductId) : null,
            purchaseUrl: r.purchaseUrl != null ? String(r.purchaseUrl) : null,
          }),
          code: r.code != null ? String(r.code) : undefined,
          description: r.description != null ? String(r.description) : undefined,
          image: r.image != null ? String(r.image) : undefined,
          storageUrl: r.storageUrl != null ? String(r.storageUrl) : undefined,
          price: r.price != null ? String(r.price) : undefined,
        });
      }
    }

    // Include resources referenced in flow.blocks (by resourceId or resourceName) so link resolution has them (same as getFunnelById)
    if (funnelFlow?.blocks && typeof funnelFlow.blocks === "object" && experience?.id) {
      const resourceIds = new Set<string>();
      const resourceNames = new Set<string>();
      for (const block of Object.values(funnelFlow.blocks) as { resourceId?: string | null; resourceName?: string | null }[]) {
        const rid = block.resourceId != null ? String(block.resourceId).trim() : "";
        if (rid && !resourcesMap.has(rid)) resourceIds.add(rid);
        const rname = block.resourceName != null ? String(block.resourceName).trim() : "";
        if (rname) resourceNames.add(rname);
      }
      if (resourceIds.size > 0 || resourceNames.size > 0) {
        const conditions = [
          ...(resourceIds.size > 0 ? [inArray(resources.id, [...resourceIds])] : []),
          ...(resourceNames.size > 0 ? [inArray(resources.name, [...resourceNames])] : []),
        ];
        if (conditions.length > 0) {
          const extraResources = await db.query.resources.findMany({
            where: and(
              eq(resources.experienceId, experience.id),
              or(...conditions),
            ),
            columns: {
              id: true,
              name: true,
              type: true,
              category: true,
              link: true,
              whopProductId: true,
              purchaseUrl: true,
              code: true,
              description: true,
              image: true,
              storageUrl: true,
              price: true,
            },
          });
          for (const r of extraResources) {
            if (!resourcesMap.has(r.id)) {
              resourcesMap.set(r.id, {
                id: r.id,
                name: r.name,
                type: r.type,
                category: r.category,
                link: effectiveLink(r),
                code: r.code ?? undefined,
                description: r.description ?? undefined,
                image: r.image ?? undefined,
                storageUrl: r.storageUrl ?? undefined,
                price: r.price ?? undefined,
              });
            }
          }
        }
      }
    }

    const resourcesList = Array.from(resourcesMap.values());

    return NextResponse.json({
      success: true,
      hasLiveFunnel: true,
      funnelFlow,
      resources: resourcesList,
      funnel: {
        id: funnelRow?.id ?? liveFunnel.id,
        name: funnelRow?.name ?? liveFunnel.name ?? undefined,
        isDeployed: funnelRow?.isDeployed ?? true,
        updatedAt: funnelRow?.updatedAt ?? new Date(),
        merchantType: funnelRow?.merchantType ?? "qualification",
      },
    });
  } catch (error) {
    console.error("Error getting live funnel:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

// Export the protected route handler
export const GET = withWhopAuth(getLiveFunnelHandler);

