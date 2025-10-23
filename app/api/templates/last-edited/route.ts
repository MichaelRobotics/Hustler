import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { templates, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function getLastEditedTemplateHandler(
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

    // Get last edited template
    const lastEditedTemplate = await db.query.templates.findFirst({
      where: and(
        eq(templates.experienceId, experience.id),
        eq(templates.isLastEdited, true)
      ),
      with: {
        theme: true,
      },
    });

    if (!lastEditedTemplate) {
      return NextResponse.json({
        success: true,
        template: null,
        message: "No last edited template found",
      });
    }

    return NextResponse.json({
      success: true,
      template: lastEditedTemplate,
    });
  } catch (error) {
    console.error("Error fetching last edited template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch last edited template" },
      { status: 500 }
    );
  }
}

export const GET = withWhopAuth(getLastEditedTemplateHandler);



