import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences } from "@/lib/supabase/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

/**
 * GET /api/userchat/conversations
 * Returns conversations for the authenticated user in the experience (status active or closed only),
 * ordered by createdAt ASC (oldest first). Archived conversations are excluded.
 */
async function getConversationsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return NextResponse.json(
        { success: false, error: "Experience not found" },
        { status: 404 }
      );
    }

    const list = await db.query.conversations.findMany({
      where: and(
        eq(conversations.experienceId, experience.id),
        eq(conversations.whopUserId, user.userId),
        inArray(conversations.status, ["active", "closed"])
      ),
      columns: {
        id: true,
        status: true,
        funnelId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [asc(conversations.createdAt)],
      with: {
        funnel: { columns: { name: true, merchantType: true } },
      },
    });

    type Row = (typeof list)[number];
    const activeId = list.find((c: Row) => c.status === "active")?.id ?? null;
    const conversationsList = list.map((c: Row) => ({
      id: c.id,
      status: c.status,
      funnelId: c.funnelId,
      funnelName: (c.funnel as { name?: string } | null)?.name ?? null,
      merchantType: (c.funnel as { merchantType?: string } | null)?.merchantType ?? "qualification",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return createSuccessResponse({
      conversations: conversationsList,
      activeId,
    });
  } catch (error) {
    console.error("[userchat/conversations] Error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

export const GET = withWhopAuth(getConversationsHandler);
