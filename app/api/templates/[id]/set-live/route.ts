import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { templates, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function setLiveTemplateHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const templateId = url.pathname.split('/').slice(-2)[0]; // Get the ID from the path

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    if (!templateId) {
      return createErrorResponse(
        "MISSING_TEMPLATE_ID",
        "Template ID is required"
      );
    }

    // Get experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return NextResponse.json(
        { success: false, error: "Experience not found" },
        { status: 404 }
      );
    }

    // Use transaction to ensure only one live template
    await db.transaction(async (tx: any) => {
      // Unset all other live templates
      await tx.update(templates)
        .set({ isLive: false })
        .where(eq(templates.experienceId, experience.id));

      // Set new live template
      await tx.update(templates)
        .set({ isLive: true })
        .where(and(
          eq(templates.id, templateId),
          eq(templates.experienceId, experience.id)
        ));
    });

    return NextResponse.json({
      success: true,
      message: "Template set as live successfully",
    });
  } catch (error) {
    console.error("Error setting live template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set live template" },
      { status: 500 }
    );
  }
}

export const POST = withWhopAuth(setLiveTemplateHandler);
