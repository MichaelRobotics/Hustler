import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { themes, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function getThemesHandler(
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

    // Get themes for this experience
    const themesList = await db.query.themes.findMany({
      where: eq(themes.experienceId, experience.id),
      orderBy: (themes: any, { asc }: any) => [asc(themes.season)],
    });

    return NextResponse.json({
      success: true,
      themes: themesList,
    });
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}

async function createThemeHandler(
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

    const body = await request.json();
    const { name, season, themePrompt, accentColor, ringColor, placeholderImage, mainHeader, subHeader } = body;

    if (!name || !season) {
      return NextResponse.json(
        { success: false, error: "Name and season are required" },
        { status: 400 }
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

    // Create theme
    const newTheme = await db.insert(themes).values({
      experienceId: experience.id,
      name,
      season,
      themePrompt,
      accentColor,
      ringColor,
      placeholderImage,
      mainHeader,
      subHeader,
    }).returning();

    return NextResponse.json({
      success: true,
      theme: newTheme[0],
    });
  } catch (error) {
    console.error("Error creating theme:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create theme" },
      { status: 500 }
    );
  }
}

export const GET = withWhopAuth(getThemesHandler);
export const POST = withWhopAuth(createThemeHandler);
