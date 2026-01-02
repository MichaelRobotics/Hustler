import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { templates, experiences, themes } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function getLiveTemplateHandler(
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

    // Get live template - try with theme relation first, fallback to without if it fails
    let liveTemplate;
    try {
      liveTemplate = await db.query.templates.findFirst({
        where: and(
          eq(templates.experienceId, experience.id),
          eq(templates.isLive, true)
        ),
        with: {
          theme: true,
        },
      });
    } catch (queryError) {
      // If the relational query fails (e.g., connection issue), try without relation
      console.warn('Error fetching template with theme relation, trying without:', queryError);
      try {
        liveTemplate = await db.query.templates.findFirst({
          where: and(
            eq(templates.experienceId, experience.id),
            eq(templates.isLive, true)
          ),
        });
        
        // If we got a template without theme, try to fetch theme separately if needed
        if (liveTemplate && liveTemplate.themeId) {
          const theme = await db.query.themes.findFirst({
            where: eq(themes.id, liveTemplate.themeId),
          });
          if (theme) {
            liveTemplate = { ...liveTemplate, theme };
          }
        }
      } catch (fallbackError) {
        console.error('Error fetching template without relation:', fallbackError);
        throw fallbackError;
      }
    }

    if (!liveTemplate) {
      return NextResponse.json({
        success: true,
        template: null,
        message: "No live template found",
      });
    }

    return NextResponse.json({
      success: true,
      template: liveTemplate,
    });
  } catch (error) {
    console.error("Error fetching live template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch live template" },
      { status: 500 }
    );
  }
}

export const GET = withWhopAuth(getLiveTemplateHandler);




